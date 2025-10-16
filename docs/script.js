/**
 * ============================================
 * TRUSTPAY - SISTEMA DE PAGAMENTO POR VOZ CONTÍNUA (v4)
 * ============================================
 * - Inicia por clique (para liberar áudio/mic)
 * - Fala inicial dinâmica com nome e valor do produto
 * - "confirmar e avançar" unifica comandos
 * - Sensor visual de áudio
 * - Todos os erros e avisos são falados ao usuário
 */

class VoicePayment {
  constructor() {
    this.step = 0;
    this.data = {};
    this.isListening = false;
    this.currentField = null;
    this.isConfirming = false;
    this.pendingValue = null;
    this.isInitialized = false;
    this.isInSuccessScreen = false;
    this.hasGreeted = false;
    this.audioStream = null;

    this.productName = "Smartphone Galaxy X20";
    this.productValue = "R$ 2.499,00";

    this.commands = {
      voltar: () => this.previousStep(),
      "confirmar e avançar": () => this.confirmAndAdvance(),
      confirmar: () => this.confirmAndAdvance(),
      avançar: () => this.confirmAndAdvance(),
      ajuda: () => this.showHelp(),
      cancelar: () => this.cancel(),
      corrigir: (t) => this.handleCorrection(t),
      repetir: () => this.repeatField(),
      "nova compra": () => this.restart(),
      finalizar: () => this.finish(),
    };

    this.fields = {
      1: ["name", "email", "cpf"],
      2: ["cardNumber", "cardName", "cardExpiry", "cardCvv"],
    };

    this.fieldAliases = {
      nome: "name",
      email: "email",
      "e-mail": "email",
      cpf: "cpf",
      cartão: "cardNumber",
      "numero do cartão": "cardNumber",
      "número do cartão": "cardNumber",
      "nome no cartão": "cardName",
      validade: "cardExpiry",
      cvv: "cardCvv",
      "c v v": "cardCvv",
      "cê vê vê": "cardCvv",
    };

    this.setupSpeech();
    this.setupVoiceRecognition();
    this.createAudioVisualizer();
  }

  /* ========= Início automático ========= */
  async startImmediately() {
    this.isInitialized = true;
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("main").style.display = "block";
    await this.ensureAudioUnlocked(); // desbloqueia o áudio
    this.updateProductSummary();

    this.speak(
      `Você está executando o pagamento do produto ${this.productName} no valor de ${this.productValue}. Diga "ajuda" a qualquer momento para ouvir os comandos.`
    );
    this.startVoiceFlow();
  }

  greetOnce() {
    if (this.hasGreeted) return;
    this.hasGreeted = true;
    const firstField = this.currentField || this.getNextEmptyField(1);
    this.speak(
      `Você está executando o pagamento do produto ${this.productName}, pelo valor de ${this.productValue}. ` +
        `Diga ajuda a qualquer momento para ouvir os comandos. ` +
        this.getFieldHint(firstField)
    );
  }

  startVoiceFlow() {
    this.step = 1;
    this.gotoStep(1);
    this.currentField = this.getNextEmptyField();
    this.greetOnce();
  }

  /* ========= Fala ========= */
  async ensureAudioUnlocked() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this._ctx) this._ctx = new AudioCtx();
      if (this._ctx.state === "suspended") await this._ctx.resume();

      const buffer = this._ctx.createBuffer(1, 1, 22050);
      const source = this._ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this._ctx.destination);
      source.start(0);
    } catch (e) {
      this.handleError(
        "Não foi possível desbloquear o áudio. Clique novamente no botão de início."
      );
    }
  }

  setupSpeech() {
    this.synth = window.speechSynthesis;
    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      this.brVoice =
        this.voices.find((v) => v.lang === "pt-BR") ||
        this.voices.find((v) => v.lang?.startsWith("pt")) ||
        this.voices[0];
    };
    this.synth.onvoiceschanged = loadVoices;
    loadVoices();
  }

  speak(text, callback) {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => callback && callback();
    synth.speak(utter);
  }

  /* ========= Reconhecimento de voz ========= */
  async setupVoiceRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.handleError("Voz não suportada neste navegador.");
      return;
    }

    // 🔹 Pede permissão só uma vez
    if (!this.audioStream) {
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      } catch {
        this.handleError("Permita o acesso ao microfone para continuar.");
        return;
      }
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = "pt-BR";
    this.recognition.continuous = true;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateStatus("🎤 Escutando...", "listening");
      this.startVisualizer();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.stopVisualizer();
      // reinicia o reconhecimento, sem pedir permissão de novo
      if (this.isInitialized && !this.isInSuccessScreen) {
        setTimeout(() => this.startListening(), 1000);
      }
    };

    this.recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        this.handleError(
          "O acesso ao microfone foi negado. Por favor, permita o uso para continuar."
        );
      }
    };

    this.recognition.onresult = (event) => {
      const text = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();
      this.processVoiceInput(text);
    };

    this.startListening();
  }

  startListening() {
    try {
      if (this.recognition && !this.isListening) this.recognition.start();
    } catch (e) {
      this.handleError("Falha ao iniciar escuta de voz.");
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) this.recognition.stop();
  }

  /* ========= Sensor de Áudio ========= */
  createAudioVisualizer() {
    const placeholder = document.getElementById("audioVisualizer");
    if (placeholder) {
      this.visualizer = placeholder;
      return;
    }
    const el = document.createElement("div");
    el.id = "audioVisualizer";
    el.className = "audio-visualizer";
    document.getElementById("voiceStatus").after(el);
    this.visualizer = el;
  }

  async startVisualizer() {
    try {
      if (!this.audioStream) {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(this.audioStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);

      const animate = () => {
        if (!this.isListening) {
          ctx.close();
          return;
        }
        requestAnimationFrame(animate);
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const scale = 1 + Math.min(avg / 100, 0.5);
        this.visualizer.style.transform = `scale(${scale})`;
        this.visualizer.classList.add("active");
        setTimeout(() => this.visualizer.classList.remove("active"), 100);
      };
      animate();
    } catch (err) {
      this.handleError("Não foi possível acessar o microfone.");
      console.error(err);
    }
  }

  stopVisualizer() {
    if (this.visualizer) this.visualizer.style.transform = "scale(1)";
  }

  /* ========= Interpretação ========= */
  processVoiceInput(text) {
    if (!text) return;
    text = text.toLowerCase().trim();

    console.log("🎧 Reconhecido:", text);

    //  Sempre disponível — independente de etapa
    if (text.includes("ajuda")) {
      this.showHelp();
      return;
    }

    if (text.includes("corrigir")) {
      const palavras = Object.keys(this.fieldAliases);
      const alvo = palavras.find((p) => text.includes(p));
      if (alvo) {
        const id = this.fieldAliases[alvo];
        this.handleCorrection(id);
      } else {
        this.handleCorrection(this.currentField);
      }
      return;
    }

    //  Início de fluxo
    if (
      !this.isInitialized &&
      (text.includes("começar pagamento") || text.includes("comecar pagamento"))
    ) {
      this.startImmediately();
      return;
    }

    //  Sucesso / finalização
    if (this.isInSuccessScreen) {
      if (text.includes("nova compra")) return this.restart();
      if (text.includes("finalizar")) return this.finish();
      return;
    }

    // Confirmações
    if (this.isConfirming) {
      if (
        text.includes("sim") ||
        text.includes("confirmar") ||
        text.includes("confirma")
      )
        return this.confirmValue();
      if (text.includes("não") || text.includes("nao"))
        return this.rejectValue();
    }

    // Comandos gerais (confirmar e avançar, voltar, etc.)
    for (const [cmd, action] of Object.entries(this.commands)) {
      if (text.includes(cmd)) return action(text);
    }

    //  Preenchimento de campo ativo
    if (this.currentField) {
      this.fillField(this.currentField, text);
    }
  }

  handleCorrection(fieldId) {
    if (!fieldId) fieldId = this.currentField;
    const el = document.getElementById(fieldId);
    if (el) el.value = "";
    this.data[fieldId] = "";
    this.currentField = fieldId;
    this.pendingValue = null;
    this.isConfirming = false;
    this.speak("Ok, vamos corrigir. " + this.getFieldHint(fieldId));
  }

  /* ========= Campos e Etapas ========= */
  getNextEmptyField(forceStep = null) {
    const step = forceStep || this.step;
    const list = this.fields[step] || [];
    for (const id of list) if (!this.data[id]) return id;
    return null;
  }

  gotoStep(step) {
    this.step = step;
    document
      .querySelectorAll(".step")
      .forEach((s) => s.classList.remove("active"));
    const el = document.getElementById(`step${step}`);
    if (el) el.classList.add("active");
  }

  confirmAndAdvance() {
    if (this.isConfirming) return this.confirmValue();
    this.nextStep();
  }

  nextStep() {
    if (this.step === 1 && !this.areStepFieldsValid(1)) {
      this.handleError("Ainda faltam dados do cliente.");
      this.currentField = this.getNextEmptyField(1);
      this.speak(this.getFieldHint(this.currentField));
      return;
    }
    if (this.step === 1) {
      this.gotoStep(2);
      this.currentField = this.getNextEmptyField(2);
      this.speak(
        "Agora vamos aos dados do cartão. " +
          this.getFieldHint(this.currentField)
      );
      return;
    }

    if (this.step === 2 && !this.areStepFieldsValid(2)) {
      this.handleError("Ainda faltam dados do cartão.");
      this.currentField = this.getNextEmptyField(2);
      this.speak(this.getFieldHint(this.currentField));
      return;
    }

    if (this.step === 2) {
      this.gotoStep(3);
      this.showConfirmation();
      return;
    }

    if (this.step === 3) this.handleConfirm();
  }

  areStepFieldsValid(step) {
    return (this.fields[step] || []).every((id) => !!this.data[id]);
  }

  getFieldHint(id) {
    const hints = {
      name: "Diga seu nome completo.",
      email: "Diga seu e-mail.",
      cpf: "Diga seu CPF com 11 dígitos.",
      cardNumber: "Diga o número do cartão.",
      cardName: "Diga o nome impresso no cartão.",
      cardExpiry: "Diga a validade no formato mês e ano.",
      cardCvv: "Diga o código de segurança C V V.",
    };
    return hints[id] || "";
  }

  getFieldLabel(id) {
    const labels = {
      name: "Nome completo",
      email: "E-mail",
      cpf: "CPF",
      cardNumber: "Número do cartão",
      cardName: "Nome no cartão",
      cardExpiry: "Validade",
      cardCvv: "C V V",
    };
    return labels[id] || id;
  }

  fillField(fieldId, text) {
    if (!fieldId || !document.getElementById(fieldId)) {
      this.handleError("Campo inválido ou inexistente: " + fieldId);
      return;
    }

    let value = this.processValue(fieldId, text);
    const valid = this.validateValue(fieldId, value);
    if (!valid.ok) {
      this.handleError(valid.voice || "Valor inválido. Tente novamente.");
      return;
    }

    // Preenche visualmente o campo
    document.getElementById(fieldId).value = valid.value;

    // Armazena valor pendente para confirmação
    this.pendingValue = valid.value;
    this.isConfirming = true;

    // Fala para o usuário o valor capturado
    let readableValue = valid.value;
    if (fieldId === "cpf") {
      readableValue = valid.value.replace(/\D/g, "").split("").join(" ");
    }
    this.speak(`${this.getFieldLabel(fieldId)}: ${readableValue}. Confirma?`);
  }

  confirmValue() {
    const id = this.currentField;
    if (!this.pendingValue) {
      this.handleError("Nenhum valor pendente para confirmação.");
      return;
    }
    this.data[id] = this.pendingValue;
    document.getElementById(id).value = this.pendingValue;
    this.pendingValue = null;
    this.isConfirming = false;

    const next = this.getNextEmptyField(this.step);
    if (next) {
      this.currentField = next;
      this.speak(this.getFieldHint(next));
    } else {
      this.nextStep();
    }
  }

  rejectValue() {
    if (this.currentField) {
      const el = document.getElementById(this.currentField);
      if (el) el.value = ""; // limpa campo na tela
    }

    this.pendingValue = null;
    this.isConfirming = false;

    this.speak("Ok, vamos repetir. " + this.getFieldHint(this.currentField));
  }

  /* ========= Validação ========= */
  processValue(id, text) {
    let t = text
      .toLowerCase()
      .replaceAll("arroba", "@")
      .replaceAll("ponto", ".");
    const digits = t.replace(/\D/g, "");
    if (id === "cpf" && digits.length === 11)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
        6,
        9
      )}-${digits.slice(9)}`;
    if (id === "cardNumber") return digits.replace(/(.{4})/g, "$1 ").trim();
    if (id === "cpf") {
      // remove palavras como "ponto", "traço", "hífen"
      t = t
        .replaceAll("ponto", "")
        .replaceAll("traço", "")
        .replaceAll("traco", "")
        .replaceAll("hífen", "")
        .replaceAll("hifen", "")
        .replace(/\D/g, "");

      if (t.length === 11)
        return `${t.slice(0, 3)}${t.slice(3, 6)}${t.slice(6, 9)}${t.slice(9)}`;
      return t;
    }
    if (id === "name") {
      return t
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    }
    if (id === "email") {
      return t.replace(/\s+/g, "").toLowerCase();
    }
    if (id === "cardExpiry" && digits.length === 4)
      return digits.slice(0, 2) + "/" + digits.slice(2);
    if (id === "cardCvv") return digits;
    return t;
  }

  validateValue(id, v) {
    const fail = (voice) => ({ ok: false, voice });
    const ok = (value) => ({ ok: true, value });

    // helpers
    const onlyDigits = (s) => (s || "").toString().replace(/\D/g, "");
    const formatCPF = (d) => {
      if (d.length !== 11) return d;
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    };
    const isValidCPF = (cpf) => {
      // cpf: apenas dígitos (11)
      if (!cpf || cpf.length !== 11) return false;
      // rejeita sequências repetidas (000... , 111..., etc)
      if (/^(\d)\1{10}$/.test(cpf)) return false;
      const calc = (slice) => {
        let sum = 0;
        for (let i = 0; i < slice; i++) {
          sum += parseInt(cpf.charAt(i), 10) * (slice + 1 - i);
        }
        const r = (sum * 10) % 11;
        return r === 10 ? 0 : r;
      };
      const d1 = calc(9);
      const d2 =
        parseInt(cpf.charAt(9), 10) === calc(9)
          ? parseInt(cpf.charAt(10), 10)
          : calc(10);
      // recomputando segundo dígito corretamente:
      let sum2 = 0;
      for (let i = 0; i < 10; i++) {
        sum2 += parseInt(cpf.charAt(i), 10) * (11 - i);
      }
      const r2 = (sum2 * 10) % 11;
      const check1 = d1 === parseInt(cpf.charAt(9), 10);
      const check2 = (r2 === 10 ? 0 : r2) === parseInt(cpf.charAt(10), 10);
      return check1 && check2;
    };

    switch (id) {
      case "cpf": {
        const digits = onlyDigits(v);
        if (digits.length !== 11) return fail("CPF deve conter 11 dígitos.");
        if (!isValidCPF(digits)) return fail("CPF inválido.");
        // retornamos formatado para visual (mas quando for falar, use leitura digitada)
        return ok(formatCPF(digits));
      }

      case "email": {
        // limpa e normaliza
        const cleaned = (v || "").toString().replace(/\s+/g, "").toLowerCase();
        // valida simples (não precisa ser perfeita)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned))
          return fail("E-mail inválido.");
        return ok(cleaned);
      }

      case "cardNumber": {
        // validação fictícia para testes: aceita entre 12 e 19 dígitos
        const digits = onlyDigits(v);
        if (digits.length < 12 || digits.length > 19)
          return fail("Número de cartão inválido.");
        // opcional: Luhn check (comentado). Se quiser ativar, descomente e use a função luhnCheck abaixo.
        // if (!luhnCheck(digits)) return fail("Número de cartão inválido.");
        return ok(digits.replace(/(.{4})/g, "$1 ").trim());
      }

      case "cardExpiry": {
        const m = (v || "").toString().match(/(\d{2})\/(\d{2})/);
        if (!m) return fail("Validade inválida. Use MM/AA.");
        const mm = parseInt(m[1], 10);
        const yy = parseInt(m[2], 10);
        if (mm < 1 || mm > 12) return fail("Mês inválido na validade.");
        // converte para ano completo (assume 20xx)
        const now = new Date();
        const thisYear = now.getFullYear() % 100;
        const thisMonth = now.getMonth() + 1;
        if (yy < thisYear || (yy === thisYear && mm < thisMonth))
          return fail("Cartão vencido.");
        // retorna no formato MM/AA
        return ok(
          `${String(mm).padStart(2, "0")}/${String(yy).padStart(2, "0")}`
        );
      }

      case "cardCvv": {
        const digits = onlyDigits(v);
        if (digits.length < 3 || digits.length > 4)
          return fail("C V V inválido.");
        return ok(digits);
      }

      default:
        return ok(v);
    }

    // opcional: função Luhn (se quiser ativar para cartões reais)
    // function luhnCheck(num) {
    //   let sum = 0;
    //   let alt = false;
    //   for (let i = num.length - 1; i >= 0; i--) {
    //     let n = parseInt(num.charAt(i), 10);
    //     if (alt) {
    //       n *= 2;
    //       if (n > 9) n -= 9;
    //     }
    //     sum += n;
    //     alt = !alt;
    //   }
    //   return sum % 10 === 0;
    // }
  }

  /* ========= Pagamento ========= */
  showConfirmation() {
    document.getElementById("confirmData").innerHTML = `
      <ul class="confirm-list">
        <li><b>Nome:</b> ${this.data.name}</li>
        <li><b>E-mail:</b> ${this.data.email}</li>
        <li><b>CPF:</b> ${this.data.cpf}</li>
        <li><b>Cartão:</b> ${this.data.cardNumber}</li>
        <li><b>Validade:</b> ${this.data.cardExpiry}</li>
      </ul>
      <p>Diga "confirmar ou avançar" para concluir.</p>
    `;
    this.speak("Revise seus dados e diga confirmar e avançar para concluir.");
  }

  handleConfirm() {
    this.updateStatus("🔒 Processando pagamento...", "processing");
    this.speak("Processando pagamento, aguarde.");
    this.stopListening();

    setTimeout(() => {
      this.isInSuccessScreen = true;
      document.getElementById("success").style.display = "block";
      this.updateStatus("✅ Pagamento aprovado!", "success");

      document.getElementById("transactionDate").textContent =
        new Date().toLocaleString("pt-BR");

      this.speak(
        `Pagamento do produto ${this.productName} no valor de ${this.productValue} aprovado com sucesso!`
      );
      setTimeout(() => this.startListening(), 2000);
    }, 2000);
  }

  restart() {
    this.data = {};
    this.isInSuccessScreen = false;
    document.getElementById("success").style.display = "none";
    this.gotoStep(1);
    this.currentField = this.getNextEmptyField(1);
    this.speak("Nova compra iniciada. " + this.getFieldHint(this.currentField));
  }

  finish() {
    this.stopListening();
    this.synth.cancel();
    this.updateStatus("✅ Sessão encerrada.", "success");
    this.speak("Sessão encerrada. Obrigado por usar o TrustPay.");
  }

  updateStatus(msg, type = "info") {
    const el = document.getElementById("voiceStatus");
    if (el) {
      el.textContent = msg;
      el.className = `voice-status ${type}`;
    }
  }

  /* ========= Novo método central de erros ========= */
  handleError(message, type = "error") {
    this.updateStatus(`⚠️ ${message}`, type);
    this.speak(`Atenção: ${message}`);
    console.warn(`[${type.toUpperCase()}] ${message}`);
  }

  updateProductSummary() {
    const nameEl = document.getElementById("productNameDisplay");
    const valueEl = document.getElementById("productValueDisplay");
    if (nameEl) nameEl.textContent = this.productName;
    if (valueEl) valueEl.textContent = this.productValue;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.trustPay = new VoicePayment();
  document.getElementById("startBtn").addEventListener("click", async () => {
    await window.trustPay.startImmediately();
  });
});
