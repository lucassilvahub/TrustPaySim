/**
 * ========================================
 * TRUSTPAY - GATEWAY DE PAGAMENTO ACESSÍVEL
 * Arquivo: script.js
 * ========================================
 */

/**
 * ========================================
 * CLASSE PRINCIPAL DO TRUSTPAY
 * ========================================
 */
class TrustPayGateway {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.formData = {};
    this.speechEnabled = true;
    this.fontSize = 16;
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
    this.showStep(1);
    this.announceWelcome();
  }

  announceWelcome() {
    console.log("Anunciando boas-vindas");

    setTimeout(() => {
      this.announceToScreenReader(
        "Bem-vindo ao TrustPay, gateway de pagamento acessível. " +
          "Use Tab para navegar, Enter para confirmar, Escape para voltar. " +
          "Pressione F1 para ajuda sobre navegação."
      );
    }, 500);
  }

  /**
   * ========================================
   * RECURSOS DE ACESSIBILIDADE
   * ========================================
   */

  setupAccessibilityFeatures() {
    // Web Speech API
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
    // Alto contraste
    if (window.matchMedia("(prefers-contrast: high)").matches) {
      document.body.classList.add("high-contrast");
    }

    // Movimento reduzido
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
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Novo: tenta usar uma voz brasileira se disponível
    const voices = this.speechSynthesis.getVoices();
    const brVoices = voices.filter((v) => v.lang.startsWith("pt-BR"));
    if (brVoices.length > 0) {
      utterance.voice = brVoices[2]; // pode trocar [0] por outro índice
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
    // CPF
    document.getElementById("customer-cpf").addEventListener("input", (e) => {
      e.target.value = this.maskCPF(e.target.value);
    });

    // Número do cartão
    document.getElementById("card-number").addEventListener("input", (e) => {
      e.target.value = this.maskCardNumber(e.target.value);
    });

    // Validade do cartão
    document.getElementById("card-expiry").addEventListener("input", (e) => {
      e.target.value = this.maskCardExpiry(e.target.value);
    });

    // CVV
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
    return value
      .replace(/\D/g, "")
      .replace(/(\d{4})(\d)/, "$1 $2")
      .replace(/(\d{4})(\d)/, "$1 $2")
      .replace(/(\d{4})(\d)/, "$1 $2")
      .replace(/(\d{4})\d+?$/, "$1");
  }

  maskCardExpiry(value) {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2}\/\d{2})\d+?$/, "$1");
  }

  maskCVV(value) {
    return value.replace(/\D/g, "");
  }

  /**
   * ========================================
   * VALIDAÇÕES ESPECÍFICAS
   * ========================================
   */

  validateCPF(cpf) {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11) return false;

    // Verificar se não são todos iguais
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    // Algoritmo de validação do CPF
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

    // Algoritmo de Luhn
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i));

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
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
      // Validação ao perder foco
      input.addEventListener("blur", (e) => {
        this.validateField(e.target);
      });

      // Limpar erros ao começar a digitar
      input.addEventListener("input", (e) => {
        if (e.target.classList.contains("error")) {
          this.clearFieldError(e.target.id);
        }
      });

      // Anúncios ao receber foco
      input.addEventListener("focus", (e) => {
        const label = e.target.labels[0]?.textContent || e.target.placeholder;
        const required = e.target.hasAttribute("required")
          ? ", campo obrigatório"
          : "";
        this.announceToScreenReader(`${label}${required}`);
      });
    });
  }

  validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const rules = this.validationRules[fieldName];

    if (!rules) return true;

    // Campo obrigatório
    if (rules.required && !value) {
      this.showFieldError(
        field.id,
        `${field.labels[0].textContent} é obrigatório`
      );
      return false;
    }

    // Comprimento mínimo
    if (rules.minLength && value.length < rules.minLength) {
      this.showFieldError(
        field.id,
        `Deve ter pelo menos ${rules.minLength} caracteres`
      );
      return false;
    }

    // Comprimento máximo
    if (rules.maxLength && value.length > rules.maxLength) {
      this.showFieldError(
        field.id,
        `Deve ter no máximo ${rules.maxLength} caracteres`
      );
      return false;
    }

    // Padrão regex
    if (rules.pattern && !rules.pattern.test(value)) {
      this.showFieldError(field.id, rules.message);
      return false;
    }

    // Validador customizado
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
      errorElement.textContent = `❌ ${message}`;
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
    // Esconder todas as etapas
    document.querySelectorAll(".step").forEach((stepEl) => {
      stepEl.classList.remove("active");
      stepEl.style.display = "none";
    });

    // Mostrar etapa atual
    if (step === "success") {
      document.getElementById("success-screen").style.display = "block";
      document.getElementById("success-screen").classList.add("active");
      this.announceToScreenReader("Pagamento realizado com sucesso!");
    } else {
      const stepElement = document.getElementById(`step-${step}`);
      stepElement.style.display = "block";
      stepElement.classList.add("active");

      // Aplicar animação se permitido
      if (!this.accessibilityFeatures.reducedMotion) {
        stepElement.classList.add("fade-in");
      }

      // Focar no primeiro input da etapa
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

    // Simular processamento com validações realistas
    setTimeout(() => {
      try {
        // Validação final dos dados
        if (!this.finalValidation()) {
          throw new Error("Dados inválidos para processamento");
        }

        const transactionId = this.generateTransactionId();
        const timestamp = new Date().toLocaleString("pt-BR");

        document.getElementById("transaction-id").textContent = transactionId;
        document.getElementById("transaction-date").textContent = timestamp;

        // Log para auditoria (em produção, enviar para servidor)
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
    // Validação adicional antes do processamento
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

    // Voltar para a etapa anterior para correção
    this.previousStep();
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

    // Escape - Voltar
    if (e.key === "Escape" && this.currentStep > 1) {
      e.preventDefault();
      this.previousStep();
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
    if (e.ctrlKey && e.key === "=") {
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
            Escape: Voltar etapa
            Ctrl+Enter: Avançar rapidamente
            F1: Esta ajuda
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
    // Navegação entre etapas
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

    // Submit do formulário
    document.getElementById("payment-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.nextStep();
    });
  }
}

/**
 * ========================================
 * FUNÇÕES GLOBAIS
 * ========================================
 */

function restartPaymentFlow() {
  window.location.reload();
}

/**
 * ========================================
 * UTILITÁRIOS E HELPERS
 * ========================================
 */

// Debounce function para otimização de performance
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

// Throttle function para eventos de scroll/resize
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

// Função para detectar se é dispositivo móvel
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Função para verificar suporte a tecnologias assistivas
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
 * LOGS E ANALYTICS
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

    // Em produção, enviar para analytics
    // this.sendToAnalytics(event);
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
 * INICIALIZAÇÃO DA APLICAÇÃO
 * ========================================
 */

let trustPayApp;
let accessibilityLogger;

// Função de inicialização principal
function initializeTrustPay() {
  try {
    // Inicializar logger de acessibilidade
    accessibilityLogger = new AccessibilityLogger();
    window.accessibilityLogger = accessibilityLogger;

    // Inicializar aplicação principal
    trustPayApp = new TrustPayGateway();
    window.trustPayApp = trustPayApp;

    // Log inicial
    accessibilityLogger.logEvent("initialization", {
      support: checkAccessibilitySupport(),
      isMobile: isMobileDevice(),
      preferredLanguage: navigator.language,
    });

    console.log("TrustPay inicializado com sucesso");
  } catch (error) {
    console.error("Erro na inicialização do TrustPay:", error);

    // Fallback básico em caso de erro
    document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ef4444;">
                <h1>Erro de Inicialização</h1>
                <p>Ocorreu um erro ao carregar o TrustPay. Por favor, recarregue a página.</p>
                <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem;">
                    Recarregar
                </button>
            </div>
        `;
  }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTrustPay);
} else {
  initializeTrustPay();
}

/**
 * ========================================
 * EXPOSIÇÃO DE FUNÇÕES GLOBAIS
 * ========================================
 */

// Expor funções necessárias no escopo global
window.restartPaymentFlow = restartPaymentFlow;
window.isMobileDevice = isMobileDevice;
window.checkAccessibilitySupport = checkAccessibilitySupport;

/**
 * ========================================
 * SERVICE WORKER (OPCIONAL)
 * ========================================
 */

// Registrar service worker para cache offline (opcional)
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

// Cleanup ao sair da página
window.addEventListener("beforeunload", () => {
  if (accessibilityLogger) {
    const summary = accessibilityLogger.getSessionSummary();
    console.log("Session Summary:", summary);

    // Em produção, enviar dados finais para analytics
    // navigator.sendBeacon('/analytics', JSON.stringify(summary));
  }

  // Cancelar síntese de voz
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
});

// Monitorar mudanças de visibilidade da página
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Pausar recursos quando a página não está visível
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  } else {
    // Retomar quando a página volta a ficar visível
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }
});

console.log("TrustPay Gateway - Sistema carregado e pronto para uso");
