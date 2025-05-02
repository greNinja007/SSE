class AdminDashboard {
  constructor() {
    this.welcomeMessage = document.getElementById("welcomeMessage");
    this.logoutButton = document.getElementById("logoutButton");
    this.adminButtons = document.querySelectorAll(".admin-button");

    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadUserData();
  }

  setupEventListeners() {
    // Logout button
    this.logoutButton.addEventListener("click", this.handleLogout.bind(this));

    // Admin buttons
    this.adminButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const url = button.dataset.url;
        this.redirectTo(url);
      });
    });
  }

  async loadUserData() {
    try {
      const response = await fetch("/api/employee", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      const firstName = data.name.trim().split(' ')[0]; // Get text before first space
      this.welcomeMessage.innerHTML = `
              <i class="fas fa-user-shield"></i> Welcome, <strong>${firstName}</strong>
          `;
    } catch (error) {
      console.error("Error loading user data:", error);
      this.welcomeMessage.innerHTML = `
              <i class="fas fa-user-shield"></i> Welcome, <strong>User</strong>
          `;

      // If there's an error fetching user data, check if we should logout
      if (error.message.includes("Unauthorized")) {
        setTimeout(() => {
          this.handleLogout();
        }, 2000);
      }
    }
  }

  async handleLogout() {
    try {
      // Add loading state to logout button
      const originalContent = this.logoutButton.innerHTML;
      this.logoutButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Logging out...';
      this.logoutButton.disabled = true;

      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      // Redirect to login page after successful logout
      window.location.href = "/login.html";
    } catch (error) {
      console.error("Error during logout:", error);
      this.logoutButton.innerHTML = originalContent;
      this.logoutButton.disabled = false;

      // Show error to user (you could implement a toast notification here)
      alert("Logout failed. Please try again.");
    }
  }

  redirectTo(url) {
    window.location.href = url;
  }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new AdminDashboard();
});
