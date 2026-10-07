(() => {
  "use strict";

  /* =======================================================
     ACCESS CODE
     -------------------------------------------------------
     The 4-digit code is stored as a SHA-256 hash rather than
     plain text. The current access code has already been set.
     ======================================================= */
  const ACCESS_CODE_HASH = "d20bdc364b3d7dfdcd81be5a3fd192d0f513fa79e92463bf0ed9efd2f46c243b";

  const STORAGE_KEY = "chanica_portfolio_access_session_v1";

  const LINKEDIN =
    "https://www.linkedin.com/in/haitong-chen-518a43297/?isSelfProfile=false";
  const EMAIL = "chanicachen@gmail.com";



  function clearAccess() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function hasAccess() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "granted";
    } catch (_) {
      return false;
    }
  }

  function rememberAccess() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "granted");
    } catch (_) {}
  }

  /* Add ?logout=1 to the URL whenever you want to see/test the gate again. */
  const url = new URL(window.location.href);
  const loggingOut = url.searchParams.get("logout") === "1";

  if (loggingOut) {
    clearAccess();
    url.searchParams.delete("logout");
    history.replaceState({}, "", url.pathname + url.search + url.hash);
  }

  if (!loggingOut && hasAccess()) {
    document.documentElement.classList.remove("access-locked");
    return;
  }

  function createGate() {
    const gate = document.createElement("div");
    gate.id = "portfolio-access-gate";

    const emailHref =
      `mailto:${EMAIL}?subject=${encodeURIComponent("Portfolio Access Request")}`;

    gate.innerHTML = `
      <header class="access-header">
        <p class="access-site-title">Chanica Chen</p>
        <p class="access-header-note">Private Portfolio</p>
      </header>

      <main class="access-main">
        <h1>Hi, welcome to my portfolio.</h1>

        <p class="access-intro">
          This is a private selection of my work. Please enter the 4-digit
          access code to continue.
        </p>

        <form class="access-form" id="access-form" novalidate>
          <label class="access-label" for="access-pin-1">
            Access code
          </label>

          <div class="access-pin-row" id="access-pin-row">
            ${[1,2,3,4].map((n) => `
              <input
                class="access-pin"
                id="access-pin-${n}"
                type="password"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="1"
                autocomplete="off"
                aria-label="Access code digit ${n}"
              >
            `).join("")}
          </div>

          <button class="access-submit" type="submit">
            Enter portfolio →
          </button>

          <p class="access-error" id="access-error" aria-live="polite"></p>
        </form>

        <section class="access-contact">
          <h2>Interested in my work?</h2>
          <p>
            If you’d like to view my portfolio, feel free to connect with me
            on LinkedIn or send me an email to request access.
          </p>

          <div class="access-links">
            <a href="${LINKEDIN}" target="_blank" rel="noopener noreferrer">
              Connect on LinkedIn ↗
            </a>
            <a href="${emailHref}">
              Request access by email ↗
            </a>
          </div>
        </section>
      </main>

      <footer class="access-footer">
        © ${new Date().getFullYear()} Chanica Chen. All rights reserved.
      </footer>
    `;

    return gate;
  }

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function init() {
    const gate = createGate();
    document.body.prepend(gate);

    const form = gate.querySelector("#access-form");
    const row = gate.querySelector("#access-pin-row");
    const error = gate.querySelector("#access-error");
    const inputs = [...gate.querySelectorAll(".access-pin")];

    const readCode = () => inputs.map(input => input.value).join("");

    const resetError = () => {
      error.textContent = "";
      row.classList.remove("is-error");
      inputs.forEach(input => input.removeAttribute("aria-invalid"));
    };

    const reject = () => {
      error.textContent =
        "That code doesn’t seem right. Try again or request access below.";

      row.classList.remove("is-error");
      void row.offsetWidth;
      row.classList.add("is-error");

      inputs.forEach(input => {
        input.value = "";
        input.setAttribute("aria-invalid", "true");
      });

      inputs[0].focus();
    };

    const unlock = () => {
      rememberAccess();
      gate.classList.add("is-leaving");

      setTimeout(() => {
        document.documentElement.classList.remove("access-locked");
        gate.remove();
      }, 220);
    };

    inputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        resetError();
        input.value = input.value.replace(/\D/g, "").slice(0, 1);

        if (input.value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });

      input.addEventListener("keydown", event => {
        if (event.key === "Backspace" && !input.value && index > 0) {
          inputs[index - 1].focus();
        }

        if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          inputs[index - 1].focus();
        }

        if (event.key === "ArrowRight" && index < inputs.length - 1) {
          event.preventDefault();
          inputs[index + 1].focus();
        }
      });

      input.addEventListener("paste", event => {
        const value = event.clipboardData
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, 4);

        if (!value) return;

        event.preventDefault();
        resetError();

        value.split("").forEach((digit, i) => {
          if (inputs[i]) inputs[i].value = digit;
        });

        inputs[Math.min(value.length, 4) - 1].focus();
      });
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const enteredCode = readCode();

      if (enteredCode.length !== 4) {
        error.textContent = "Please enter all four digits.";
        const emptyInput = inputs.find(input => !input.value);
        (emptyInput || inputs[0]).focus();
        return;
      }

      const enteredHash = await sha256(enteredCode);

      if (enteredHash === ACCESS_CODE_HASH) {
        unlock();
      } else {
        reject();
      }
    });

    requestAnimationFrame(() => inputs[0].focus());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
