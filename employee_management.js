class EmployeeManager {
  constructor() {
    this.designations = ["Admin", "Technician", "Assistant"];
    this.initElements();
    this.setupEventListeners();
    this.fetchEmployees();
  }

  initElements() {
    // Form elements
    this.employeeForm = document.getElementById("employee-form");
    this.employeeNameInput = document.getElementById("employee_name");
    this.emailInput = document.getElementById("email");
    this.phoneInput = document.getElementById("phone");
    this.designationInput = document.getElementById("designation");
    this.optionsContainer = document.getElementById("designation-options");
    this.submitBtn = document.querySelector(".submit-btn");
    this.submitText = document.getElementById("submit-text");
    this.submitSpinner = document.getElementById("submit-spinner");
    this.formError = document.getElementById("form-error");

    // Modal elements
    this.dbModal = document.getElementById("db-modal");
    this.csvModal = document.getElementById("csv-modal");
    this.showDbBtn = document.getElementById("show-db-btn");
    this.showCsvBtn = document.getElementById("csv-btn");
    this.closeDbBtn = document.getElementById("close-db-btn");
    this.closeCsvBtn = document.getElementById("close-csv-btn");
    this.searchInput = document.getElementById("search-input");
    this.employeeTable = document.getElementById("employee-table");
    this.csvInput = document.getElementById("csv-input");
    this.uploadCsvBtn = document.getElementById("upload-csv-btn");
    this.uploadStatus = document.getElementById("csv-upload-status");
    this.dbModal.addEventListener(
      "click",
      this.handleModalOutsideClick.bind(this)
    );
    this.csvModal.addEventListener(
      "click",
      this.handleModalOutsideClick.bind(this)
    );

    // Navigation
    this.backBtn = document.getElementById("back-btn");
  }

  setupEventListeners() {
    // Form submission
    this.employeeForm.addEventListener(
      "submit",
      this.handleFormSubmit.bind(this)
    );

    // Designation dropdown
    this.designationInput.addEventListener(
      "focus",
      this.showDesignationOptions.bind(this)
    );
    document.addEventListener("click", this.handleOutsideClick.bind(this));

    // Modal controls
    this.showDbBtn.addEventListener("click", () =>
      this.toggleModal(this.dbModal)
    );
    this.showCsvBtn.addEventListener("click", () =>
      this.toggleModal(this.csvModal)
    );
    this.closeDbBtn.addEventListener("click", () =>
      this.toggleModal(this.dbModal, false)
    );
    this.closeCsvBtn.addEventListener("click", () =>
      this.toggleModal(this.csvModal, false)
    );

    // Search functionality
    this.searchInput.addEventListener("input", this.filterEmployees.bind(this));

    // Table actions
    this.employeeTable.addEventListener(
      "click",
      this.handleTableActions.bind(this)
    );

    // CSV upload
    this.uploadCsvBtn.addEventListener(
      "click",
      this.handleCsvUpload.bind(this)
    );

    // Navigation
    this.backBtn.addEventListener("click", () => window.history.back());
  }

  async fetchEmployees() {
    try {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      this.displayEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      this.showError("Failed to load employee data. Please try again.");
    }
  }

  displayEmployees(employees) {
    const tbody = this.employeeTable.querySelector("tbody");
    tbody.innerHTML = "";

    employees.forEach((employee) => {
      const row = document.createElement("tr");
      row.innerHTML = `
              <td>${employee.name || "N/A"}</td>
              <td>${employee.email || "N/A"}</td>
              <td>${employee.ph_no || "N/A"}</td>
              <td>${employee.designation || "N/A"}</td>
              <td class="actions-cell">
                  <button class="action-btn edit-btn" data-employee-phone="${
                    employee.ph_no
                  }" title="Edit">
                      <i class="fas fa-edit"></i>
                  </button>
                  <button class="action-btn delete-btn" data-employee-phone="${
                    employee.ph_no
                  }" title="Delete">
                      <i class="fas fa-trash-alt"></i>
                  </button>
              </td>
          `;
      tbody.appendChild(row);
    });
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    this.setLoadingState(true);

    const employeeData = {
      employee_name: this.employeeNameInput.value.trim(),
      email: this.emailInput.value.trim(),
      phone: this.phoneInput.value.trim(),
      designation: this.designationInput.value.trim(),
    };

    try {
      const employeeId = this.employeeForm.getAttribute("data-employee-id");
      if (employeeId) {
        await this.updateEmployee(employeeId, employeeData);
      } else {
        await this.createEmployee(employeeData);
      }
      this.fetchEmployees();
      this.clearForm();
    } catch (error) {
      console.error("Error saving employee:", error);
      this.showError(
        error.message || "Failed to save employee. Please try again."
      );
    } finally {
      this.setLoadingState(false);
    }
  }

  async createEmployee(employeeData) {
    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });
    if (!response.ok) throw new Error("Failed to create employee");
  }

  async updateEmployee(employeeId, employeeData) {
    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });
    if (!response.ok) throw new Error("Failed to update employee");
  }

  async deleteEmployee(employeeId) {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete employee");
      this.fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      this.showError("Failed to delete employee. Please try again.");
    }
  }

  async editEmployee(employeeId) {
    try {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (!response.ok) throw new Error("Failed to fetch employee data");
      const employee = await response.json();

      this.employeeNameInput.value = employee.name;
      this.emailInput.value = employee.email || "";
      this.phoneInput.value = employee.ph_no;
      this.designationInput.value = employee.designation;
      this.employeeForm.setAttribute("data-employee-id", employee.ph_no);

      this.toggleModal(this.dbModal, false);
      this.employeeForm.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error editing employee:", error);
      this.showError("Failed to load employee data. Please try again.");
    }
  }

  showDesignationOptions() {
    this.optionsContainer.innerHTML = this.designations
      .map((role) => `<div class="option">${role}</div>`)
      .join("");
    this.optionsContainer.style.display = "block";

    this.optionsContainer.querySelectorAll(".option").forEach((option) => {
      option.addEventListener("click", () => {
        this.designationInput.value = option.textContent;
        this.optionsContainer.style.display = "none";
      });
    });
  }

  handleOutsideClick(e) {
    if (
      e.target !== this.designationInput &&
      !this.optionsContainer.contains(e.target)
    ) {
      this.optionsContainer.style.display = "none";
    }
  }
  handleModalOutsideClick(e) {
    // Check if click is outside any modal content
    if (e.target === this.dbModal) {
      this.toggleModal(this.dbModal, false);
    }
    if (e.target === this.csvModal) {
      this.toggleModal(this.csvModal, false);
    }
  }

  filterEmployees() {
    const searchTerm = this.searchInput.value.toLowerCase();
    document.querySelectorAll("#employee-table tbody tr").forEach((row) => {
      const [nameTd, emailTd] = row.querySelectorAll("td");
      const match = [nameTd, emailTd].some((td) =>
        td.textContent.toLowerCase().includes(searchTerm)
      );
      row.style.display = match ? "" : "none";
    });
  }

  handleTableActions(e) {
    const target = e.target.closest(".action-btn");
    if (!target) return;

    const employeeId = target.getAttribute("data-employee-phone");
    if (target.classList.contains("edit-btn")) {
      this.editEmployee(employeeId);
    } else if (target.classList.contains("delete-btn")) {
      this.deleteEmployee(employeeId);
    }
  }

  async handleCsvUpload() {
    const file = this.csvInput.files[0];
    if (!file) {
      this.showUploadStatus("Please select a CSV file first.", "error");
      return;
    }

    this.showUploadStatus("Uploading...", "info");
    this.uploadCsvBtn.disabled = true;

    try {
      const formData = new FormData();
      formData.append("csvFile", file);

      const response = await fetch("/api/upload-employees-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      this.showUploadStatus(
        data.message || "CSV uploaded successfully!",
        "success"
      );
      this.fetchEmployees();
      setTimeout(() => this.toggleModal(this.csvModal, false), 1500);
    } catch (error) {
      console.error("Error uploading CSV:", error);
      this.showUploadStatus(error.message || "Failed to upload CSV", "error");
    } finally {
      this.uploadCsvBtn.disabled = false;
    }
  }

  showUploadStatus(message, type) {
    this.uploadStatus.textContent = message;
    this.uploadStatus.className = `upload-status ${type}`;
    this.uploadStatus.style.display = "block";
  }

  toggleModal(modal, show = true) {
    modal.style.display = show ? "block" : "none";
    document.body.style.overflow = show ? "hidden" : "auto";
  }

  setLoadingState(isLoading) {
    this.submitText.style.display = isLoading ? "none" : "inline";
    this.submitSpinner.style.display = isLoading ? "inline-block" : "none";
    this.submitBtn.disabled = isLoading;
  }

  showError(message) {
    this.formError.textContent = message;
    this.formError.style.display = "block";
    setTimeout(() => (this.formError.style.display = "none"), 5000);
  }

  clearForm() {
    this.employeeForm.reset();
    this.employeeForm.removeAttribute("data-employee-id");
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new EmployeeManager();
});
