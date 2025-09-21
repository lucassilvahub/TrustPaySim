/**
 * ========================================
 * TRUSTPAY - GATEWAY DE PAGAMENTO ACESSÍVEL
 * Arquivo: script.js - VERSÃO COMPLETA
 * ========================================
 */

/**
 * ========================================
 * CLASSE PRINCIPAL DO TRUSTPAY APRIMORADA
 * ========================================
 */
class TrustPayGateway {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.formData = {};
    this.speechEnabled = true;
    this.fontSize = 16;
    this.speechRate = 0.9;
    this.fieldReadbackEnabled = true;
    this.smartValidationEnabled = true;
    this.lastSpokenValue = new Map();
    this.voiceCommands = new Map();
    this.validationRules = this.setupValidationRules();
    this.accessibilityFeatures = {
      audioEnabled: true,
      highContrast: false,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
    };

    this.init();
  }

  /**
   * ========================================
   * INICIALIZAÇÃO
   * ========================================
   */

  init() {
    this.setupEventListeners();
    this.setupAccessibilityFeatures();
    this.setupRealTimeValidation();
    this.setupKeyboardNavigation();
    this.setupEnhancedFeatures();
    this.showStep(1);
    this.announceWelcome();
  }

  setupEnhancedFeatures() {
    this.setupSmartFieldReadback();
    this.setupVoiceCommands();
    this.setupSmartValidation();
    this.setupFieldConfirmation();
    this.improveAriaLabels();
    this.setupAccessibilityPreferences();
  }

  announceWelcome() {
    setTimeout(() => {
      this.announceToScreenReader(
        "Bem-vindo ao TrustPay, gateway de pagamento acessível. " +
          "Use Tab para navegar, Enter para confirmar, Escape para voltar. " +
          "Pressione F1 para ajuda, F2 para repetir campo, F3 para comandos de voz."
      );
    }, 1000);
  }

  /**
   * ========================================
   * RECURSOS DE ACESSIBILIDADE APRIMORADOS
   * ========================================
   */

  setupAccessibilityFeatures() {
    this.speechSynthesis = window.speechSynthesis;

    // Botão de toggle de áudio
    document.getElementById("toggle-audio").addEventListener("click", () => {
      this.toggleAudio();
    });

    // Controles de fonte
    document.getElementById("increase-font").addEventListener("click", () => {
      this.adjustFontSize(2);
    });

    document.getElementById("decrease-font").addEventListener("click", () => {
      this.adjustFontSize(-2);
    });

    // Detectar preferências do sistema
    this.detectSystemPreferences();
  }

  setupAccessibilityPreferences() {
    document
      .getElementById("accessibility-prefs")
      .addEventListener("click", () => {
        this.showAccessibilityPreferences();
      });
  }

  showAccessibilityPreferences() {
    const modal = this.createPreferencesModal();
    document.body.appendChild(modal);

    // Focar no modal
    setTimeout(() => {
      modal.querySelector('input[type="checkbox"]').focus();
    }, 100);

    this.announceToScreenReader("Configurações de acessibilidade abertas");
  }

  createPreferencesModal() {
    const modal = document.createElement("div");
    modal.className = "accessibility-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", "prefs-title");
    modal.setAttribute("aria-modal", "true");

    modal.innerHTML = `
      <div class="modal-content">
        <button type="button" class="modal-close" aria-label="Fechar configurações">&times;</button>
        <h2 id="prefs-title">Configurações de Acessibilidade</h2>
        
        <div class="pref-group">
          <label>
            <input type="checkbox" id="field-readback" ${
              this.fieldReadbackEnabled ? "checked" : ""
            }>
            <span>Leitura automática dos campos preenchidos</span>
          </label>
        </div>
        
        <div class="pref-group">
          <label>
            <input type="checkbox" id="smart-validation" ${
              this.smartValidationEnabled ? "checked" : ""
            }>
            <span>Validação inteligente durante digitação</span>
          </label>
        </div>
        
        <div class="pref-group">
          <label>
            <span>Velocidade da voz:</span>
            <input type="range" id="speech-rate" min="0.5" max="2" step="0.1" value="${
              this.speechRate
            }">
            <span id="rate-value">${this.speechRate}</span>
          </label>
        </div>
        
        <div class="button-group">
          <button type="button" class="btn btn-primary" id="save-prefs">
            Salvar Configurações
          </button>
        </div>
      </div>
    `;

    // Event listeners do modal
    modal.querySelector(".modal-close").addEventListener("click", () => {
      this.closeModal(modal);
    });

    modal.querySelector("#save-prefs").addEventListener("click", () => {
      this.savePreferences(modal);
    });

    modal.querySelector("#speech-rate").addEventListener("input", (e) => {
      modal.querySelector("#rate-value").textContent = e.target.value;
    });

    // Fechar com Escape
    modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeModal(modal);
      }
    });

    return modal;
  }

  closeModal(modal) {
    modal.remove();
    this.announceToScreenReader("Configurações fechadas");
    document.getElementById("accessibility-prefs").focus();
  }

  savePreferences(modal) {
    this.fieldReadbackEnabled = modal.querySelector("#field-readback").checked;
    this.smartValidationEnabled =
      modal.querySelector("#smart-validation").checked;
    this.speechRate = parseFloat(modal.querySelector("#speech-rate").value);

    this.announceToScreenReader("Configurações salvas");
    this.closeModal(modal);
  }

  toggleAudio() {
    this.speechEnabled = !this.speechEnabled;
    const btn = document.getElementById("toggle-audio");
    btn.textContent = this.speechEnabled ? "🔊" : "🔇";
    btn.classList.toggle("active", this.speechEnabled);

    this.announceToScreenReader(
      this.speechEnabled ? "Áudio ativado" : "Áudio desativado"
    );
  }

  adjustFontSize(change) {
    this.fontSize = Math.max(12, Math.min(24, this.fontSize + change));
    document.documentElement.style.fontSize = this.fontSize + "px";

    this.announceToScreenReader(`Tamanho da fonte: ${this.fontSize} pixels`);
  }

  detectSystemPreferences() {
    if (window.matchMedia("(prefers-contrast: high)").matches) {
      document.body.classList.add("high-contrast");
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.accessibilityFeatures.reducedMotion = true;
      document.body.classList.add("reduced-motion");
    }
  }

  speak(text) {
    if (!this.speechEnabled || !this.speechSynthesis) return;

    this.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = this.speechRate;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    const voices = this.speechSynthesis.getVoices();
    const brVoices = voices.filter((v) => v.lang.startsWith("pt-BR"));
    if (brVoices.length > 0) {
      utterance.voice = brVoices[0];
    }

    this.speechSynthesis.speak(utterance);
  }

  announceToScreenReader(message, urgent = false) {
    const region = urgent
      ? document.getElementById("live-region-urgent")
      : document.getElementById("live-region");

    region.textContent = message;
    this.speak(message);

    setTimeout(() => {
      region.textContent = "";
    }, 2000);
  }

  /**
   * ========================================
   * LEITURA INTELIGENTE DE CAMPOS
   * ========================================
   */

  setupSmartFieldReadback() {
    const inputs = document.querySelectorAll(".form-input");

    inputs.forEach((input) => {
      // Readback ao completar campo
      input.addEventListener("blur", (e) => {
        if (e.target.value.trim() && this.fieldReadbackEnabled) {
          setTimeout(() => {
            this.readbackFieldValue(e.target);
          }, 500);
        }
      });

      // Readback com Enter (sem perder foco)
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.value.trim()) {
          e.preventDefault();
          this.readbackFieldValue(e.target);
        }
      });

      // Anúncios ao receber foco
      input.addEventListener("focus", (e) => {
        const fieldName = this.getFieldFriendlyName(e.target);
        const required = e.target.hasAttribute("required")
          ? ", campo obrigatório"
          : "";
        this.announceToScreenReader(`${fieldName}${required}`);
      });
    });
  }

  readbackFieldValue(field, forced = false) {
    const fieldName = this.getFieldFriendlyName(field);
    const value = field.value.trim();

    if (!value) return;

    // Evitar repetição desnecessária
    const lastValue = this.lastSpokenValue.get(field.id);
    if (!forced && lastValue === value) return;

    let readableValue = this.makeValueReadable(field, value);
    const message = `${fieldName}: ${readableValue}`;

    this.announceToScreenReader(message);
    this.lastSpokenValue.set(field.id, value);

    // Vibração para mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Feedback visual
    this.showReadbackFeedback(field);
  }

  showReadbackFeedback(field) {
    field.style.boxShadow = "0 0 0 3px rgba(34, 197, 94, 0.3)";
    setTimeout(() => {
      field.style.boxShadow = "";
    }, 800);
  }

  getFieldFriendlyName(field) {
    const friendlyNames = {
      "customer-name": "Nome",
      "customer-email": "Email",
      "customer-cpf": "CPF",
      "card-number": "Número do cartão",
      "card-name": "Nome no cartão",
      "card-expiry": "Validade",
      "card-cvv": "CVV",
    };

    return (
      friendlyNames[field.id] ||
      field.labels[0]?.textContent.replace("*", "").trim() ||
      "Campo"
    );
  }

  makeValueReadable(field, value) {
    const fieldId = field.id;

    switch (fieldId) {
      case "customer-cpf":
        return value
          .replace(/\./g, " ponto ")
          .replace(/-/g, " hífen ")
          .split("")
          .join(" ");

      case "card-number":
        return value
          .split("")
          .map((char) => (char === " " ? "espaço" : char))
          .join(" ");

      case "card-expiry":
        return value.replace(/\//g, " barra ").split("").join(" ");

      case "card-cvv":
        return value.split("").join(" ");

      case "customer-email":
        return value.replace(/@/g, " arroba ").replace(/\./g, " ponto ");

      default:
        return value;
    }
  }

  /**
   * ========================================
   * COMANDOS DE VOZ
   * ========================================
   */

  setupVoiceCommands() {
    this.voiceCommands.set("repetir", () => this.repeatLastField());
    this.voiceCommands.set("confirmar", () => this.confirmCurrentField());
    this.voiceCommands.set("próximo", () => this.goToNextField());
    this.voiceCommands.set("anterior", () => this.goToPreviousField());
    this.voiceCommands.set("resumo", () => this.readCurrentStepSummary());
    this.voiceCommands.set("ajuda", () => this.showHelp());
  }

  startVoiceRecognition() {
    if (
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      this.announceToScreenReader("Reconhecimento de voz não disponível");
      return;
    }

    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      this.announceToScreenReader("Escutando comando...");
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase().trim();
      this.executeVoiceCommand(command);
    };

    recognition.onerror = () => {
      this.announceToScreenReader("Comando não reconhecido");
    };

    recognition.start();
  }

  executeVoiceCommand(command) {
    for (let [keyword, action] of this.voiceCommands) {
      if (command.includes(keyword)) {
        action();
        return;
      }
    }
    this.announceToScreenReader(`Comando "${command}" não reconhecido`);
  }

  /**
   * ========================================
   * VALIDAÇÃO INTELIGENTE
   * ========================================
   */

  setupSmartValidation() {
    const inputs = document.querySelectorAll(".form-input");

    inputs.forEach((input) => {
      let validationTimeout;

      input.addEventListener("input", (e) => {
        clearTimeout(validationTimeout);

        if (this.smartValidationEnabled) {
          validationTimeout = setTimeout(() => {
            this.progressiveValidation(e.target);
          }, 1500);
        }
      });
    });
  }

  progressiveValidation(field) {
    const value = field.value.trim();
    if (!value) return;

    const fieldId = field.id;
    let feedback = this.getProgressiveFeedback(fieldId, value);

    if (feedback) {
      this.announceProgressiveFeedback(feedback);
      this.showProgressiveHint(field, feedback);
    }
  }

  announceProgressiveFeedback(message) {
    const region = document.getElementById("progressive-announcer");
    region.textContent = message;

    setTimeout(() => {
      region.textContent = "";
    }, 3000);
  }

  getProgressiveFeedback(fieldId, value) {
    switch (fieldId) {
      case "customer-cpf":
        const cpfLength = value.replace(/\D/g, "").length;
        if (cpfLength > 0 && cpfLength < 11) {
          return `CPF: ${cpfLength} de 11 dígitos digitados`;
        }
        break;

      case "card-number":
        const cardLength = value.replace(/\D/g, "").length;
        if (cardLength > 0 && cardLength < 16) {
          return `Cartão: ${cardLength} de 16 dígitos digitados`;
        }
        if (cardLength >= 4) {
          const cardType = this.detectCardType(value);
          if (cardType) {
            return `Cartão ${cardType} detectado`;
          }
        }
        break;

      case "customer-email":
        if (value.includes("@") && !value.includes(".")) {
          return "Email: adicione o domínio após o ponto";
        }
        if (value.includes("gmai.com")) {
          return "Você quis dizer gmail.com?";
        }
        break;

      case "card-expiry":
        const expiryLength = value.replace(/\D/g, "").length;
        if (expiryLength === 2) {
          return "Validade: mês digitado, digite o ano";
        }
        break;
    }
    return null;
  }

  detectCardType(cardNumber) {
    const cleaned = cardNumber.replace(/\D/g, "");

    if (cleaned.startsWith("4")) return "Visa";
    if (cleaned.startsWith("5") || cleaned.startsWith("2")) return "Mastercard";
    if (cleaned.startsWith("3")) return "American Express";
    if (cleaned.startsWith("6")) return "Elo";

    return null;
  }

  showProgressiveHint(field, message) {
    let hintElement = document.getElementById(`${field.id}-progressive-hint`);

    if (!hintElement) {
      hintElement = document.createElement("div");
      hintElement.id = `${field.id}-progressive-hint`;
      hintElement.className = "progressive-hint";
      field.closest(".form-group").appendChild(hintElement);
    }

    hintElement.textContent = message;
    hintElement.style.opacity = "1";

    setTimeout(() => {
      hintElement.style.opacity = "0";
    }, 4000);
  }

  /**
   * ========================================
   * CONFIRMAÇÃO DE CAMPOS
   * ========================================
   */

  setupFieldConfirmation() {
    const inputs = document.querySelectorAll(".form-input");

    inputs.forEach((input) => {
      const confirmBtn = input.parentNode.querySelector(".field-confirm-btn");
      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
          this.readbackFieldValue(input, true);
        });
      }
    });
  }

  /**
   * ========================================
   * MELHORIAS DE ARIA LABELS
   * ========================================
   */

  improveAriaLabels() {
    // Melhorar labels para não falar "asterisco"
    const requiredFields = document.querySelectorAll("input[required]");

    requiredFields.forEach((field) => {
      const label = field.labels[0];
      if (label) {
        const asterisk = label.querySelector(".required");
        if (asterisk) {
          asterisk.setAttribute("aria-hidden", "true");
        }
      }
    });
  }

  /**
   * ========================================
   * SISTEMA DE VALIDAÇÃO
   * ========================================
   */

  setupValidationRules() {
    return {
      customerName: {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
        message: "Nome deve conter apenas letras e espaços",
      },
      customerEmail: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Digite um e-mail válido",
      },
      customerCpf: {
        required: true,
        validator: this.validateCPF.bind(this),
        message: "CPF inválido",
      },
      cardNumber: {
        required: true,
        validator: this.validateCardNumber.bind(this),
        message: "Número do cartão deve ter 16 dígitos",
      },
      cardName: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: /^[a-zA-ZÀ-ÿ\s]+$/,
        message: "Nome deve conter apenas letras e espaços",
      },
      cardExpiry: {
        required: true,
        validator: this.validateCardExpiry.bind(this),
        message: "Data de validade inválida ou cartão expirado",
      },
      cardCvv: {
        required: true,
        validator: this.validateCVV.bind(this),
        message: "CVV deve ter 3 ou 4 dígitos",
      },
    };
  }

  /**
   * ========================================
   * MÁSCARAS DE INPUT
   * ========================================
   */

  setupInputMasks() {
    document.getElementById("customer-cpf").addEventListener("input", (e) => {
      e.target.value = this.maskCPF(e.target.value);
    });

    document.getElementById("card-number").addEventListener("input", (e) => {
      e.target.value = this.maskCardNumber(e.target.value);
    });

    document.getElementById("card-expiry").addEventListener("input", (e) => {
      e.target.value = this.maskCardExpiry(e.target.value);
    });

    document.getElementById("card-cvv").addEventListener("input", (e) => {
      e.target.value = this.maskCVV(e.target.value);
    });
  }

  maskCPF(value) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  }

  maskCardNumber(value) {
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.substring(0, 16);
    return limited.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  maskCardExpiry(value) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2}\/\d{2})\d+?$/, "$1");
  }

  maskCVV(value) {
    return value.replace(/\D/g, "").substring(0, 4);
  }

  /**
   * ========================================
   * VALIDAÇÕES ESPECÍFICAS
   * ========================================
   */

  validateCPF(cpf) {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return false;

    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.charAt(10))) return false;

    return true;
  }

  validateCardNumber(number) {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.length !== 16) return false;
    return true;
  }

  validateCardExpiry(expiry) {
    const cleaned = expiry.replace(/\D/g, "");
    if (cleaned.length !== 4) return false;

    const month = parseInt(cleaned.substring(0, 2));
    const year = parseInt("20" + cleaned.substring(2, 4));
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (month < 1 || month > 12) return false;
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }

  validateCVV(cvv) {
    const cleaned = cvv.replace(/\D/g, "");
    return cleaned.length >= 3 && cleaned.length <= 4;
  }

  /**
   * ========================================
   * VALIDAÇÃO EM TEMPO REAL
   * ========================================
   */

  setupRealTimeValidation() {
    this.setupInputMasks();

    const inputs = document.querySelectorAll(".form-input");
    inputs.forEach((input) => {
      input.addEventListener("blur", (e) => {
        this.validateField(e.target);
      });

      input.addEventListener("input", (e) => {
        if (e.target.classList.contains("error")) {
          this.clearFieldError(e.target.id);
        }
      });
    });
  }

  validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const rules = this.validationRules[fieldName];

    if (!rules) return true;

    if (rules.required && !value) {
      this.showFieldError(
        field.id,
        `${field.labels[0].textContent.replace("*", "").trim()} é obrigatório`
      );
      return false;
    }

    if (rules.minLength && value.length < rules.minLength) {
      this.showFieldError(
        field.id,
        `Deve ter pelo menos ${rules.minLength} caracteres`
      );
      return false;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      this.showFieldError(
        field.id,
        `Deve ter no máximo ${rules.maxLength} caracteres`
      );
      return false;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      this.showFieldError(field.id, rules.message);
      return false;
    }

    if (rules.validator && !rules.validator(value)) {
      this.showFieldError(field.id, rules.message);
      return false;
    }

    this.showFieldSuccess(field.id);
    return true;
  }

  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(
      fieldId.replace(/([A-Z])/g, "-$1").toLowerCase() + "-error"
    );

    field.classList.add("error");
    field.classList.remove("success");
    field.setAttribute("aria-invalid", "true");

    if (errorElement) {
      errorElement.textContent = `⚠ ${message}`;
      errorElement.className = "field-message error";
    }

    this.announceToScreenReader(`Erro: ${message}`, true);
  }

  showFieldSuccess(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(
      fieldId.replace(/([A-Z])/g, "-$1").toLowerCase() + "-error"
    );

    field.classList.remove("error");
    field.classList.add("success");
    field.setAttribute("aria-invalid", "false");

    if (errorElement) {
      errorElement.textContent = "✓ Válido";
      errorElement.className = "field-message success";
    }
  }

  clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(
      fieldId.replace(/([A-Z])/g, "-$1").toLowerCase() + "-error"
    );

    field.classList.remove("error", "success");
    field.removeAttribute("aria-invalid");

    if (errorElement) {
      errorElement.textContent = "";
      errorElement.className = "field-message";
    }
  }

  /**
   * ========================================
   * NAVEGAÇÃO ENTRE ETAPAS
   * ========================================
   */

  validateStep(step) {
    let isValid = true;
    const stepFields = this.getStepFields(step);

    stepFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    if (isValid) {
      this.saveStepData(step);
    }

    return isValid;
  }

  getStepFields(step) {
    const stepFields = {
      1: ["customer-name", "customer-email", "customer-cpf"],
      2: ["card-number", "card-name", "card-expiry", "card-cvv"],
    };
    return stepFields[step] || [];
  }

  saveStepData(step) {
    if (step === 1) {
      this.formData.customerName = document
        .getElementById("customer-name")
        .value.trim();
      this.formData.customerEmail = document
        .getElementById("customer-email")
        .value.trim();
      this.formData.customerCpf = document
        .getElementById("customer-cpf")
        .value.trim();
    } else if (step === 2) {
      this.formData.cardNumber = document
        .getElementById("card-number")
        .value.trim();
      this.formData.cardName = document
        .getElementById("card-name")
        .value.trim();
      this.formData.cardExpiry = document
        .getElementById("card-expiry")
        .value.trim();
      this.formData.cardCvv = document.getElementById("card-cvv").value.trim();
    }
  }

  updateStepIndicators() {
    for (let i = 1; i <= this.totalSteps; i++) {
      const indicator = document.getElementById(`step-indicator-${i}`);

      if (i < this.currentStep) {
        indicator.classList.remove("active");
        indicator.classList.add("completed");
      } else if (i === this.currentStep) {
        indicator.classList.add("active");
        indicator.classList.remove("completed");
      } else {
        indicator.classList.remove("active", "completed");
      }
    }
  }

  updateProgressIndicator() {
    const progressIndicator = document.getElementById("progress-indicator");
    const stepNames = ["Dados do Cliente", "Dados do Cartão", "Confirmação"];
    progressIndicator.textContent = `Etapa ${this.currentStep} de ${
      this.totalSteps
    }: ${stepNames[this.currentStep - 1]}`;
  }

  showStep(step) {
    document.querySelectorAll(".step").forEach((stepEl) => {
      stepEl.classList.remove("active");
      stepEl.style.display = "none";
    });

    if (step === "success") {
      document.getElementById("success-screen").style.display = "block";
      document.getElementById("success-screen").classList.add("active");
      this.announceToScreenReader("Pagamento realizado com sucesso!");
    } else {
      const stepElement = document.getElementById(`step-${step}`);
      stepElement.style.display = "block";
      stepElement.classList.add("active");

      if (!this.accessibilityFeatures.reducedMotion) {
        stepElement.classList.add("fade-in");
      }

      const firstInput = stepElement.querySelector(".form-input");
      if (firstInput) {
        setTimeout(() => {
          firstInput.focus();
        }, 100);
      }

      this.updateStepIndicators();
      this.updateProgressIndicator();
      this.announceToScreenReader(`Etapa ${step} de ${this.totalSteps}`);
    }
  }

  nextStep() {
    if (this.validateStep(this.currentStep)) {
      if (this.currentStep === this.totalSteps) {
        this.processPayment();
      } else {
        this.currentStep++;
        this.showStep(this.currentStep);

        if (this.currentStep === 3) {
          this.updateConfirmationData();
        }
      }
    } else {
      this.announceToScreenReader(
        "Há erros no formulário. Corrija-os antes de continuar.",
        true
      );
      this.focusFirstError();
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
    }
  }

  focusFirstError() {
    const firstError = document.querySelector(".form-input.error");
    if (firstError) {
      firstError.focus();
    }
  }

  updateConfirmationData() {
    document.getElementById("confirm-name").textContent =
      this.formData.customerName;
    document.getElementById("confirm-email").textContent =
      this.formData.customerEmail;
    document.getElementById("confirm-cpf").textContent =
      this.formData.customerCpf;

    const cardLast4 = this.formData.cardNumber.replace(/\D/g, "").slice(-4);
    document.getElementById(
      "confirm-card"
    ).textContent = `**** **** **** ${cardLast4}`;
  }

  /**
   * ========================================
   * PROCESSAMENTO DE PAGAMENTO
   * ========================================
   */

  processPayment() {
    const submitButton = document.getElementById("submit-payment");
    submitButton.classList.add("loading");
    submitButton.disabled = true;

    this.announceToScreenReader("Processando pagamento. Aguarde...", true);

    setTimeout(() => {
      try {
        if (!this.finalValidation()) {
          throw new Error("Dados inválidos para processamento");
        }

        const transactionId = this.generateTransactionId();
        const timestamp = new Date().toLocaleString("pt-BR");

        document.getElementById("transaction-id").textContent = transactionId;
        document.getElementById("transaction-date").textContent = timestamp;

        console.log("Transaction processed:", {
          id: transactionId,
          timestamp: timestamp,
          amount: 154.4,
          customerData: {
            name: this.formData.customerName,
            email: this.formData.customerEmail,
            cpf: this.formData.customerCpf.replace(/\D/g, ""),
          },
        });

        this.showStep("success");
      } catch (error) {
        this.handlePaymentError(error);
      } finally {
        submitButton.classList.remove("loading");
        submitButton.disabled = false;
      }
    }, 3000);
  }

  finalValidation() {
    const requiredFields = [
      "customerName",
      "customerEmail",
      "customerCpf",
      "cardNumber",
      "cardName",
      "cardExpiry",
      "cardCvv",
    ];

    return requiredFields.every((field) => {
      const value = this.formData[field];
      return value && value.trim().length > 0;
    });
  }

  generateTransactionId() {
    const year = new Date().getFullYear();
    const randomId = String(Math.floor(Math.random() * 999999)).padStart(
      6,
      "0"
    );
    return `TP-${year}-${randomId}`;
  }

  handlePaymentError(error) {
    console.error("Payment error:", error);
    this.announceToScreenReader(
      "Erro no processamento. Tente novamente.",
      true
    );
    this.previousStep();
  }

  /**
   * ========================================
   * FUNÇÕES DE NAVEGAÇÃO POR VOZ
   * ========================================
   */

  repeatLastField() {
    const activeField = document.activeElement;
    if (activeField && activeField.classList.contains("form-input")) {
      this.readbackFieldValue(activeField, true);
    } else {
      this.announceToScreenReader("Nenhum campo ativo para repetir");
    }
  }

  confirmCurrentField() {
    const activeField = document.activeElement;
    if (activeField && activeField.classList.contains("form-input")) {
      const isValid = this.validateField(activeField);
      const status = isValid ? "válido" : "inválido";
      this.announceToScreenReader(`Campo ${status}`);
    }
  }

  goToNextField() {
    const inputs = Array.from(
      document.querySelectorAll(".form-input:not([disabled])")
    );
    const currentIndex = inputs.findIndex(
      (input) => input === document.activeElement
    );

    if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
      inputs[currentIndex + 1].focus();
      this.announceToScreenReader("Próximo campo");
    } else {
      this.announceToScreenReader("Último campo da etapa");
    }
  }

  goToPreviousField() {
    const inputs = Array.from(
      document.querySelectorAll(".form-input:not([disabled])")
    );
    const currentIndex = inputs.findIndex(
      (input) => input === document.activeElement
    );

    if (currentIndex > 0) {
      inputs[currentIndex - 1].focus();
      this.announceToScreenReader("Campo anterior");
    } else {
      this.announceToScreenReader("Primeiro campo da etapa");
    }
  }

  readCurrentStepSummary() {
    const stepData = this.getStepSummary(this.currentStep);
    this.announceToScreenReader(stepData);
  }

  getStepSummary(step) {
    switch (step) {
      case 1:
        return `Etapa 1: Dados do Cliente. Preencha nome, email e CPF. 
                Total do pedido: R$ 154,40`;
      case 2:
        return `Etapa 2: Dados do Cartão. Preencha número, nome, validade e CVV`;
      case 3:
        return `Etapa 3: Confirmação. Revise os dados antes de finalizar`;
      default:
        return `Etapa ${step} de ${this.totalSteps}`;
    }
  }

  /**
   * ========================================
   * NAVEGAÇÃO POR TECLADO
   * ========================================
   */

  setupKeyboardNavigation() {
    document.addEventListener("keydown", (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  handleKeyboardShortcuts(e) {
    // F1 - Ajuda
    if (e.key === "F1") {
      e.preventDefault();
      this.showHelp();
      return;
    }

    // F2 - Repetir campo atual
    if (e.key === "F2") {
      e.preventDefault();
      this.repeatLastField();
      return;
    }

    // F3 - Comando de voz
    if (e.key === "F3") {
      e.preventDefault();
      this.startVoiceRecognition();
      return;
    }

    // Escape - Voltar
    if (e.key === "Escape") {
      e.preventDefault();
      if (document.querySelector(".accessibility-modal")) {
        this.closeModal(document.querySelector(".accessibility-modal"));
      } else if (this.currentStep > 1) {
        this.previousStep();
      }
      return;
    }

    // Ctrl+Enter - Avançar rapidamente
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      this.nextStep();
      return;
    }

    // Ctrl+Shift+S - Toggle áudio
    if (e.ctrlKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      this.toggleAudio();
      return;
    }

    // Ctrl++ - Aumentar fonte
    if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      this.adjustFontSize(2);
      return;
    }

    // Ctrl+- - Diminuir fonte
    if (e.ctrlKey && e.key === "-") {
      e.preventDefault();
      this.adjustFontSize(-2);
      return;
    }
  }

  showHelp() {
    const helpText = `
            TrustPay - Atalhos de teclado:
            Tab: Navegar entre campos
            Enter: Confirmar/Avançar
            Escape: Voltar etapa ou fechar modal
            Ctrl+Enter: Avançar rapidamente
            F1: Esta ajuda
            F2: Repetir valor do campo atual
            F3: Ativar comando de voz
            Ctrl+Shift+S: Ligar/desligar áudio
            Ctrl + ou =: Aumentar fonte
            Ctrl -: Diminuir fonte
        `;
    this.announceToScreenReader(helpText);
  }

  /**
   * ========================================
   * EVENT LISTENERS
   * ========================================
   */

  setupEventListeners() {
    document
      .getElementById("next-step-1")
      ?.addEventListener("click", () => this.nextStep());
    document
      .getElementById("next-step-2")
      ?.addEventListener("click", () => this.nextStep());
    document
      .getElementById("back-step-2")
      ?.addEventListener("click", () => this.previousStep());
    document
      .getElementById("back-step-3")
      ?.addEventListener("click", () => this.previousStep());

    document.getElementById("payment-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.nextStep();
    });
  }
}

/**
 * ========================================
 * LOGS E ANALYTICS CONTINUAÇÃO
 * ========================================
 */

class AccessibilityLogger {
  constructor() {
    this.events = [];
    this.sessionStart = Date.now();
  }

  logEvent(type, details) {
    const event = {
      timestamp: Date.now(),
      sessionTime: Date.now() - this.sessionStart,
      type: type,
      details: details,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    this.events.push(event);
    console.log("Accessibility Event:", event);
  }

  logInteraction(element, interaction) {
    this.logEvent("interaction", {
      element: element.id || element.className,
      interaction: interaction,
      focusMethod: document.activeElement === element ? "keyboard" : "mouse",
    });
  }

  logError(error, context) {
    this.logEvent("error", {
      message: error.message,
      context: context,
      stack: error.stack,
    });
  }

  getSessionSummary() {
    return {
      sessionDuration: Date.now() - this.sessionStart,
      totalEvents: this.events.length,
      eventTypes: this.events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {}),
      accessibilityFeatures: checkAccessibilitySupport(),
    };
  }
}

/**
 * ========================================
 * FUNÇÕES GLOBAIS E UTILITÁRIOS
 * ========================================
 */

function restartPaymentFlow() {
  window.location.reload();
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function checkAccessibilitySupport() {
  return {
    speechSynthesis: "speechSynthesis" in window,
    speechRecognition:
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window,
    vibration: "vibrate" in navigator,
    screenReader:
      navigator.userAgent.includes("NVDA") ||
      navigator.userAgent.includes("JAWS") ||
      navigator.userAgent.includes("Dragon"),
  };
}

/**
 * ========================================
 * CONFIGURAÇÃO DE ERRO GLOBAL
 * ========================================
 */

window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
  if (window.trustPayApp && window.accessibilityLogger) {
    window.accessibilityLogger.logError(event.error, "global");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  if (window.trustPayApp && window.accessibilityLogger) {
    window.accessibilityLogger.logError(new Error(event.reason), "promise");
  }
});

/**
 * ========================================
 * MELHORIAS DE PERFORMANCE
 * ========================================
 */

const preloadResources = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
};

/**
 * ========================================
 * DETECÇÃO DE TECNOLOGIAS ASSISTIVAS
 * ========================================
 */

const detectAssistiveTech = () => {
  const features = {
    screenReader: false,
    voiceControl: false,
    highContrast: false,
    reducedMotion: false,
  };

  if (
    navigator.userAgent.includes("NVDA") ||
    navigator.userAgent.includes("JAWS") ||
    navigator.userAgent.includes("VoiceOver") ||
    navigator.userAgent.includes("TalkBack")
  ) {
    features.screenReader = true;
  }

  if (window.matchMedia("(prefers-contrast: high)").matches) {
    features.highContrast = true;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    features.reducedMotion = true;
  }

  let mouseUsed = false;
  let keyboardUsed = false;

  document.addEventListener("mousedown", () => {
    mouseUsed = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") keyboardUsed = true;
  });

  setTimeout(() => {
    if (keyboardUsed && !mouseUsed) {
      features.keyboardOnly = true;
      console.log("Navegação apenas por teclado detectada");
    }
  }, 5000);

  return features;
};

/**
 * ========================================
 * MONITORAMENTO DE ACESSIBILIDADE
 * ========================================
 */

const monitorAccessibility = () => {
  const fieldTimes = new Map();

  document.addEventListener("focusin", (e) => {
    if (e.target.classList.contains("form-input")) {
      fieldTimes.set(e.target.id, Date.now());
    }
  });

  document.addEventListener("focusout", (e) => {
    if (e.target.classList.contains("form-input")) {
      const startTime = fieldTimes.get(e.target.id);
      if (startTime) {
        const duration = Date.now() - startTime;
        if (duration > 30000) {
          console.log(
            `Campo ${e.target.id}: ${duration}ms (pode indicar dificuldade)`
          );

          if (window.accessibilityLogger) {
            window.accessibilityLogger.logEvent("field_struggle", {
              fieldId: e.target.id,
              duration: duration,
              value: e.target.value.length,
            });
          }
        }
      }
    }
  });

  let errorCount = 0;
  const originalShowFieldError = TrustPayGateway.prototype.showFieldError;

  TrustPayGateway.prototype.showFieldError = function (fieldId, message) {
    errorCount++;
    if (errorCount > 5) {
      console.log(
        "Muitos erros detectados - pode indicar problema de usabilidade"
      );
      this.announceToScreenReader(
        "Muitos erros detectados. Pressione F1 para ajuda ou F3 para usar comandos de voz."
      );
    }
    return originalShowFieldError.call(this, fieldId, message);
  };
};

/**
 * ========================================
 * INICIALIZAÇÃO DA APLICAÇÃO
 * ========================================
 */

let trustPayApp;
let accessibilityLogger;

function initializeTrustPay() {
  try {
    if (window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log(
            "Vozes carregadas:",
            voices.filter((v) => v.lang.startsWith("pt"))
          );
        }
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      }
    }

    accessibilityLogger = new AccessibilityLogger();
    window.accessibilityLogger = accessibilityLogger;

    trustPayApp = new TrustPayGateway();
    window.trustPayApp = trustPayApp;

    accessibilityLogger.logEvent("initialization", {
      support: checkAccessibilitySupport(),
      isMobile: isMobileDevice(),
      preferredLanguage: navigator.language,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height,
      },
      timestamp: new Date().toISOString(),
    });

    console.log("TrustPay inicializado com sucesso");
    console.log("Recursos de acessibilidade:", checkAccessibilitySupport());
  } catch (error) {
    console.error("Erro na inicialização do TrustPay:", error);

    document.body.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #ef4444; font-family: Arial, sans-serif;">
        <h1>Erro de Inicialização</h1>
        <p>Ocorreu um erro ao carregar o TrustPay. Por favor, recarregue a página.</p>
        <button onclick="window.location.reload()" 
                style="margin-top: 1rem; padding: 0.75rem 1.5rem; 
                       background: #4f46e5; color: white; border: none; 
                       border-radius: 8px; cursor: pointer; font-size: 1rem;">
          Recarregar
        </button>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #6b7280;">
          Se o problema persistir, entre em contato com o suporte.
        </p>
      </div>
    `;
  }
}

/**
 * ========================================
 * EXPOSIÇÃO DE FUNÇÕES GLOBAIS
 * ========================================
 */

window.restartPaymentFlow = restartPaymentFlow;
window.isMobileDevice = isMobileDevice;
window.checkAccessibilitySupport = checkAccessibilitySupport;
window.detectAssistiveTech = detectAssistiveTech;

/**
 * ========================================
 * SERVICE WORKER (OPCIONAL)
 * ========================================
 */

if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registrado:", registration);
      })
      .catch((registrationError) => {
        console.log("SW falhou:", registrationError);
      });
  });
}

/**
 * ========================================
 * CLEANUP E PERFORMANCE
 * ========================================
 */

window.addEventListener("beforeunload", () => {
  if (accessibilityLogger) {
    const summary = accessibilityLogger.getSessionSummary();
    console.log("Session Summary:", summary);
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  } else {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }
});

window.addEventListener("blur", () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
  }
});

window.addEventListener("focus", () => {
  if (
    window.speechSynthesis &&
    window.trustPayApp &&
    window.trustPayApp.speechEnabled
  ) {
    window.speechSynthesis.resume();
  }
});

/**
 * ========================================
 * DEBUGGING E DESENVOLVIMENTO
 * ========================================
 */

if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  window.DEBUG_TrustPay = {
    app: () => window.trustPayApp,
    logger: () => window.accessibilityLogger,
    testVoice: (text) => window.trustPayApp?.speak(text || "Teste de voz"),
    testReadback: (fieldId) => {
      const field = document.getElementById(fieldId);
      if (field && window.trustPayApp) {
        window.trustPayApp.readbackFieldValue(field, true);
      }
    },
    getSessionSummary: () => window.accessibilityLogger?.getSessionSummary(),
    simulateError: (fieldId, message) => {
      if (window.trustPayApp) {
        window.trustPayApp.showFieldError(fieldId, message);
      }
    },
  };

  console.log("🔧 DEBUG_TrustPay disponível no console para testes");
  console.log('Exemplo: DEBUG_TrustPay.testVoice("Olá mundo")');
}

/**
 * ========================================
 * INICIALIZAÇÃO PRINCIPAL
 * ========================================
 */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    preloadResources();
    initializeTrustPay();
    monitorAccessibility();
    detectAssistiveTech();
  });
} else {
  preloadResources();
  initializeTrustPay();
  monitorAccessibility();
  detectAssistiveTech();
}

console.log("🚀 TrustPay Gateway - Sistema carregado e pronto para uso");
console.log("♿ Recursos de acessibilidade:", checkAccessibilitySupport());
