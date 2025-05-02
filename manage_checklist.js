class ChecklistManager {
  constructor() {
    // Configurable constants
    this.HEADER_TYPES = ["TEXT", "INT", "DATE", "BOOLEAN", "FLOAT"];
    this.RESERVED_SQL_WORDS = new Set([
      "select", "table", "insert", "update", "delete", 
      "where", "from", "join", "group", "order"
    ]);

    this.initElements();
    this.setupEventListeners();
    this.addHeaderRow(); // Start with one empty row
    this.loadChecklists();
  }

  // ======================
  // Initialization Methods
  // ======================

  initElements() {
    // Form elements
    this.form = document.getElementById("db-form");
    this.submitBtn = this.form.querySelector(".submit-btn");
    this.submitText = document.getElementById("submit-text");
    this.submitSpinner = document.getElementById("submit-spinner");
    this.errorDiv = document.getElementById("form-error");
    this.headersTbody = document.getElementById("headers-tbody");

    // Navigation elements
    this.backBtn = document.getElementById("back-btn");

    // Database modal elements
    this.showDbBtn = document.getElementById("show-db-btn");
    this.dbModal = document.getElementById("db-modal");
    this.closeDbBtn = document.getElementById("close-db-btn");
    this.dbSearch = document.getElementById("search-input");
    this.dbTableBody = document.getElementById("database-tbody");

    // API configuration
    this.API_BASE = "/api";
    this.ENDPOINTS = {
      CHECKLISTS: `${this.API_BASE}/checklist_index`,
      CHECKLIST_BY_ID: (id) => `${this.API_BASE}/checklist_index/${id}`,
      CHECKLIST_TABLE: `${this.API_BASE}/checklist_table`,
      CHECKLIST_TABLE_BY_NAME: (table_name) => 
        `${this.API_BASE}/checklist_table/${table_name}`,
    };

    // State management
    this.currentChecklistId = null;
    this.originalTableName = null;
    this.debounceTimer = null;
  }

  setupEventListeners() {
    // Modal interactions
    this.dbModal.addEventListener("click", (e) => {
      if (e.target === this.dbModal) this.closeDbModal();
    });

    // Navigation
    this.backBtn?.addEventListener("click", () => {
      window.location.href = "/admin";
    });

    // Modal toggles
    this.showDbBtn.addEventListener("click", () => this.openDbModal());
    this.closeDbBtn.addEventListener("click", () => this.closeDbModal());

    // Form submission
    this.form.addEventListener("submit", (e) => this.handleFormSubmit(e));

    // Search with debounce
    this.dbSearch?.addEventListener("input", () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.filterChecklists(), 300);
    });

    // Table actions (delegated)
    this.dbTableBody.addEventListener("click", (e) => {
      this.handleTableActionClick(e);
    });
  }

  // ======================
  // Modal Management
  // ======================

  openDbModal() {
    this.dbModal.classList.add("show");
    this.dbModal.style.display = "block";
    this.dbSearch.focus();
  }

  closeDbModal() {
    this.dbModal.classList.remove("show");
    this.dbModal.style.display = "none";
  }

  // ======================
  // Header Row Management
  // ======================

  addHeaderRow(header = { name: "", type: "" }) {
    const row = document.createElement("tr");
    row.setAttribute("role", "row");

    // Name cell
    const nameCell = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.name = "header_name[]";
    nameInput.className = "header-input";
    nameInput.value = header.name || "";
    nameInput.required = false;
    nameInput.setAttribute("aria-label", "Header name");
    nameCell.appendChild(nameInput);

    // Type cell
    const typeCell = document.createElement("td");
    const typeSelect = document.createElement("select");
    typeSelect.name = "header_type[]";
    typeSelect.className = "type-select";
    typeSelect.required = true;
    typeSelect.setAttribute("aria-label", "Header type");

    this.HEADER_TYPES.forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      if (header?.type === type) option.selected = true;
      typeSelect.appendChild(option);
    });
    typeCell.appendChild(typeSelect);

    // Action cell
    const actionCell = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';
    removeBtn.setAttribute("aria-label", "Remove header");
    actionCell.appendChild(removeBtn);

    row.append(nameCell, typeCell, actionCell);
    this.headersTbody.appendChild(row);

    // Auto-add new row when typing in last row
    nameInput.addEventListener("input", () => {
      const isLastRow = !row.nextElementSibling;
      if (isLastRow && nameInput.value.trim()) {
        this.addHeaderRow();
      }
    });

    // Remove row handler
    removeBtn.addEventListener("click", () => {
      if (this.headersTbody.rows.length > 1) {
        row.remove();
      }
    });
  }

  // ======================
  // Form Handling
  // ======================

  async handleFormSubmit(e) {
    e.preventDefault();
    
    try {
      if (!this.validateForm()) return;
      
      const payload = this.preparePayload();
      const isEdit = this.currentChecklistId !== null;
      
      this.setLoadingState(true);
      
      // Save checklist metadata
      const checklistUrl = isEdit
        ? this.ENDPOINTS.CHECKLIST_BY_ID(this.currentChecklistId)
        : this.ENDPOINTS.CHECKLISTS;
      
      const savedChecklist = await this.apiRequest(checklistUrl, {
        method: isEdit ? "PUT" : "POST",
        body: payload,
      });

      // Create/update SQL table
      const tableUrl = isEdit
        ? this.ENDPOINTS.CHECKLIST_TABLE_BY_NAME(payload.linked_checklist)
        : this.ENDPOINTS.CHECKLIST_TABLE;
      
      await this.apiRequest(tableUrl, {
        method: isEdit ? "PUT" : "POST",
        body: {
          original_table_name: isEdit ? this.originalTableName : payload.linked_checklist,
          new_table_name: payload.linked_checklist,
          headers: payload.sanitizedHeaders,
        },
      });

      this.showSuccess(`Checklist ${isEdit ? "updated" : "created"} successfully!`);
      this.resetForm();
      this.closeDbModal();
      window.location.reload();
    } catch (err) {
      this.showError(err.message || "An unexpected error occurred.");
    } finally {
      this.setLoadingState(false);
    }
  }

  preparePayload() {
    const formData = new FormData(this.form);
    const site_name = formData.get("site_name").trim();
    const system_name = formData.get("system_name").trim();
    const po_no = formData.get("po_no").trim();
    
    // Process headers
    const headers = [];
    formData.getAll("header_name[]").forEach((name, i) => {
      if (name.trim()) {
        headers.push({
          name: name.trim(),
          type: formData.getAll("header_type[]")[i],
        });
      }
    });

    const sanitizedHeaders = this.sanitizeHeaders(headers);
    const linked_checklist = this.generateTableName(site_name, system_name, po_no);

    return {
      site_name,
      system_name,
      po_no,
      linked_checklist,
      sanitizedHeaders,
      original_table_name: this.originalTableName || linked_checklist,
    };
  }

  validateForm() {
    // Required fields validation
    const requiredFields = ["site_name", "system_name", "po_no"];
    const missingFields = requiredFields.filter(
      field => !this.form.elements[field].value.trim()
    );
    
    if (missingFields.length > 0) {
      throw new Error(
        `Please fill in: ${missingFields.map(f => f.replace("_", " ")).join(", ")}`
      );
    }

    // Headers validation
    const hasHeaders = Array.from(
      this.headersTbody.querySelectorAll('input[name="header_name[]"]')
    ).some(input => input.value.trim());
    
    if (!hasHeaders) {
      throw new Error("Please add at least one header");
    }

    return true;
  }

  // ======================
  // Data Sanitization
  // ======================

  generateTableName(site_name, system_name, po_no) {
    const sanitize = (str) => {
      return str
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .replace(/_+/g, "_");
    };

    return `${sanitize(site_name)}_${sanitize(system_name)}_${sanitize(po_no)}_checklist`;
  }

  sanitizeHeaders(headers) {
    return headers
      .filter(header => header.name && header.name.trim() && header.type)
      .map(header => {
        let name = header.name.trim();

        // Basic sanitization
        name = name
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "");

        if (!name) return null;

        // Ensure valid SQL column name
        if (!/^[a-z]/.test(name)) name = `col_${name}`;
        if (this.RESERVED_SQL_WORDS.has(name)) name = `${name}_value`;
        
        return {
          name: name.substring(0, 64), // Enforce length limit
          type: header.type.trim(),
        };
      })
      .filter(Boolean);
  }

  // ======================
  // Checklist CRUD Operations
  // ======================

  async loadChecklists() {
    try {
      this.setTableLoadingState(true);
      const data = await this.apiRequest(this.ENDPOINTS.CHECKLISTS);
      
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from server");
      }
      
      this.renderChecklists(data);
    } catch (err) {
      console.error("Failed to load checklists:", err);
      this.showTableError(err.message);
    } finally {
      this.setTableLoadingState(false);
    }
  }

  renderChecklists(checklists) {
    this.dbTableBody.innerHTML = "";
    
    if (checklists.length === 0) {
      this.dbTableBody.innerHTML = `
        <tr>
          <td colspan="5">No checklists found. Create one to get started.</td>
        </tr>
      `;
      return;
    }
    
    checklists.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.site_name || "N/A"}</td>
        <td>${item.system_name || "N/A"}</td>
        <td>${item.po_no || "N/A"}</td>
        <td>${item.linked_checklist || "N/A"}</td>
        <td>
          <button class='action-btn edit-btn' data-checklist-id='${item.id}'>
            <i class='fas fa-edit'></i>
          </button>
          <button class='action-btn delete-btn' data-checklist-id='${item.id}'>
            <i class='fas fa-trash-alt'></i>
          </button>
        </td>
      `;
      this.dbTableBody.appendChild(row);
    });
  }

  async loadChecklistForEdit(id) {
    try {
      this.setLoadingState(true);
      
      // Fetch checklist metadata
      const checklist = await this.apiRequest(this.ENDPOINTS.CHECKLIST_BY_ID(id));
      
      this.currentChecklistId = id;
      this.originalTableName = checklist.linked_checklist;

      // Populate form fields
      this.form.elements.site_name.value = checklist.site_name;
      this.form.elements.system_name.value = checklist.system_name;
      this.form.elements.po_no.value = checklist.po_no;

      // Fetch table structure
      const tableInfo = await this.apiRequest(
        this.ENDPOINTS.CHECKLIST_TABLE_BY_NAME(checklist.linked_checklist)
      );

      if (!tableInfo?.columns) {
        throw new Error("Failed to load table structure");
      }

      // Clear and repopulate headers
      this.headersTbody.innerHTML = "";
      
      // Filter out system columns and add editable ones
      tableInfo.columns
        .filter(col => !["id", "created_at", "updated_at"].includes(col.name))
        .forEach(col => this.addHeaderRow(col));
        
    } catch (err) {
      console.error("Error loading checklist for edit:", err);
      this.showError(err.message);
    } finally {
      this.addHeaderRow();
      this.setLoadingState(false);
    }
  }

  async deleteChecklist(id) {
    if (!confirm("Are you sure you want to delete this checklist and all its data?")) {
      return;
    }

    try {
      this.setTableLoadingState(true);
      
      // Get checklist details first
      const checklist = await this.apiRequest(this.ENDPOINTS.CHECKLIST_BY_ID(id));
      
      // Delete the metadata record
      await this.apiRequest(this.ENDPOINTS.CHECKLIST_BY_ID(id), {
        method: "DELETE",
      });

      // Delete the associated table if it exists
      if (checklist.linked_checklist) {
        await this.apiRequest(
          this.ENDPOINTS.CHECKLIST_TABLE_BY_NAME(checklist.linked_checklist), 
          { method: "DELETE" }
        );
      }

      // Refresh the list
      this.loadChecklists();
    } catch (err) {
      this.showError(err.message || "Failed to delete checklist");
    } finally {
      this.setTableLoadingState(false);
    }
  }

  // ======================
  // UI Helpers
  // ======================

  handleTableActionClick(e) {
    const editBtn = e.target.closest(".edit-btn");
    const deleteBtn = e.target.closest(".delete-btn");
    
    if (editBtn) {
      this.loadChecklistForEdit(editBtn.dataset.checklistId);
    } else if (deleteBtn) {
      this.deleteChecklist(deleteBtn.dataset.checklistId);
    }
  }

  filterChecklists() {
    const term = this.dbSearch.value.toLowerCase();
    this.dbTableBody.querySelectorAll("tr").forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(term)
        ? ""
        : "none";
    });
  }

  setLoadingState(isLoading) {
    this.submitBtn.disabled = isLoading;
    this.submitText.style.display = isLoading ? "none" : "inline";
    this.submitSpinner.style.display = isLoading ? "inline-block" : "none";
  }

  setTableLoadingState(isLoading) {
    if (isLoading) {
      this.dbTableBody.innerHTML = `
        <tr>
          <td colspan="5">Loading checklists...</td>
        </tr>
      `;
    }
  }

  showTableError(message) {
    this.dbTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="error-message">${message}</td>
      </tr>
    `;
  }

  showError(message) {
    if (this.errorDiv) {
      this.errorDiv.textContent = message;
      this.errorDiv.className = "error-message error";
      this.errorDiv.style.display = "block";
      setTimeout(() => (this.errorDiv.style.display = "none"), 5000);
    } else {
      alert(message);
    }
  }

  showSuccess(message) {
    if (this.errorDiv) {
      this.errorDiv.textContent = message;
      this.errorDiv.className = "error-message success";
      this.errorDiv.style.display = "block";
      setTimeout(() => (this.errorDiv.style.display = "none"), 5000);
    } else {
      alert(message);
    }
  }

  resetForm() {
    this.form.reset();
    this.headersTbody.innerHTML = "";
    this.currentChecklistId = null;
    this.originalTableName = null;
    this.addHeaderRow();
  }

  // ======================
  // API Utilities
  // ======================

  async apiRequest(url, opts = {}) {
    const config = {
      method: opts.method || "GET",
      headers: { 
        "Content-Type": "application/json", 
        ...(opts.headers || {}) 
      },
    };

    if (opts.body) {
      config.body = JSON.stringify(opts.body);
    }

    const response = await fetch(url, config);
    
    if (response.status === 204) {
      return null; // No Content response
    }

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => new ChecklistManager());