class LoginController {
  constructor() {
    this.loginForm = document.getElementById("loginForm");
    this.userIDInput = document.getElementById("userIDInput");
    this.passwordInput = document.getElementById("passwordInput");
    this.togglePassword = document.getElementById("togglePassword");
    this.errorMessage = document.getElementById("errorMessage");
    this.loginButton = document.querySelector(".login__submit");

    this.initEventListeners();
    this.checkForSessionError();
  }

  initEventListeners() {
    // Input formatting for user ID
    this.userIDInput.addEventListener("input", this.formatUserID.bind(this));

    // Password visibility toggle
    this.togglePassword.addEventListener(
      "click",
      this.togglePasswordVisibility.bind(this)
    );

    // Form submission
    this.loginForm.addEventListener("submit", this.handleLogin.bind(this));
  }

  checkForSessionError() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionError = urlParams.get("sessionError");
    if (sessionError) {
      this.showError("Your session has expired. Please log in again.");
    }
  }

  formatUserID() {
    // Remove all non-digit characters
    let value = this.userIDInput.value.replace(/\D/g, "");

    // Limit to 10 characters
    value = value.substring(0, 10);

    // Update the input value
    this.userIDInput.value = value;
  }

  togglePasswordVisibility() {
    const type =
      this.passwordInput.getAttribute("type") === "password"
        ? "text"
        : "password";
    this.passwordInput.setAttribute("type", type);
    this.togglePassword.classList.toggle("fa-eye-slash");
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = "block";

    // Auto-hide error after 5 seconds
    setTimeout(() => {
      this.errorMessage.style.display = "none";
    }, 5000);
  }

  async handleLogin(event) {
    event.preventDefault();

    // Clear previous errors
    this.errorMessage.style.display = "none";

    const username = this.userIDInput.value.trim();
    const password = this.passwordInput.value.trim();

    // Basic validation
    if (!username || username.length !== 10) {
      this.showError("Please enter a valid 10-digit phone number");
      this.userIDInput.focus();
      return;
    }

    if (!password || password.length < 5) {
      this.showError("Password must be at least 5 characters");
      this.passwordInput.focus();
      return;
    }

    // Show loading state
    this.setLoadingState(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Login failed. Please check your credentials."
        );
      }

      // Redirect based on designation
      this.redirectUser(data.designation);
    } catch (error) {
      console.error("Login error:", error);
      this.showError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  redirectUser(designation) {
    const normalizedDesignation = designation.trim().toLowerCase();
    const routes = {
      admin: "/admin.html",
      technician: "/technician.html",
      assistant: "/assistant.html",
    };

    const targetPage = routes[normalizedDesignation] || "/";
    window.location.href=targetPage;
  }

  setLoadingState(isLoading) {
    if (isLoading) {
      this.loginButton.disabled = true;
      this.loginButton.innerHTML =
        '<span class="button__text">Logging in...</span><i class="fas fa-spinner fa-spin button__icon"></i>';
    } else {
      this.loginButton.disabled = false;
      this.loginButton.innerHTML =
        '<span class="button__text">Log In</span><i class="button__icon fas fa-chevron-right"></i>';
    }
  }
}

// Initialize the login controller when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  new LoginController();
});
