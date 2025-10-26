// ============================================
// TRUSTPAY - Sistema de Pagamento por Voz
// Reconhecimento contínuo e automático
// Fluxo sequencial - pede dado por dado
// Compatível: Chrome, Safari, Edge, Android
// ============================================

// Verificação de suporte
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechSynthesis = window.speechSynthesis;

// Elementos DOM
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const main = document.getElementById("main");
const voiceStatus = document.getElementById("voiceStatus");
const audioVisualizer = document.getElementById("audioVisualizer");
const toast = document.getElementById("toast");
const liveRegion = document.getElementById("liveRegion");
const helpBtn = document.getElementById("helpBtn");

// Elementos dos formulários
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const cpfInput = document.getElementById("cpf");
const cardNumberInput = document.getElementById("cardNumber");
const cardNameInput = document.getElementById("cardName");
const cardExpiryInput = document.getElementById("cardExpiry");
const cardCvvInput = document.getElementById("cardCvv");

// Steps
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const successStep = document.getElementById("success");

// Estado da aplicação
let recognition = null;
let isListening = false;
let restartAttempts = 0;
const maxRestartAttempts = 50;
let audioContext = null;
let analyser = null;
let microphone = null;
let animationFrame = null;
let isSpeaking = false;

// Controle de fluxo sequencial
let currentField = 0;
let waitingConfirmation = false;
let lastCapturedData = "";
let currentFieldName = "";

// Dados do pagamento
const paymentData = {
  name: "",
  email: "",
  cpf: "",
  cardNumber: "",
  cardName: "",
  cardExpiry: "",
  cardCvv: "",
  productName: "Notebook Gamer Pro X15",
  productValue: "R$ 2.499,00",
};

// Sequência de campos a serem preenchidos
const fieldSequence = [
  {
    name: "name",
    label: "nome completo",
    input: nameInput,
    hint: document.getElementById("nameHint"),
    step: 1,
    validate: (value) => value.length > 2,
    format: (value) =>
      value
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    question: "Por favor, diga seu nome completo.",
    confirmation: (value) =>
      `Você disse: ${value}. Está correto? Diga sim para confirmar ou não para repetir.`,
  },
  {
    name: "email",
    label: "e-mail",
    input: emailInput,
    hint: document.getElementById("emailHint"),
    step: 1,
    validate: (value) => value.includes("@") && value.includes("."),
    format: (value) => {
      let email = value
        .replace(/arroba/g, "@")
        .replace(/ponto/g, ".")
        .replace(/\s+/g, "")
        .toLowerCase();

      if (!email.includes("@")) {
        const words = value.split(" ").filter((w) => w);
        if (words.length >= 3) {
          const user = words.slice(0, -2).join("");
          const domain = words.slice(-2).join(".");
          email = `${user}@${domain}`;
        }
      }
      return email;
    },
    question:
      "Agora, diga seu e-mail. Por exemplo: joão ponto silva arroba gmail ponto com.",
    confirmation: (value) => `Email: ${value}. Está correto? Diga sim ou não.`,
  },
  {
    name: "cpf",
    label: "CPF",
    input: cpfInput,
    hint: document.getElementById("cpfHint"),
    step: 1,
    validate: (value) => value.replace(/\D/g, "").length === 11,
    format: (value) => {
      const numbers = value.replace(/\D/g, "");
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    },
    question: "Digite seu CPF com 11 dígitos.",
    confirmation: (value) => `CPF: ${value}. Está correto? Diga sim ou não.`,
  },
  {
    name: "cardNumber",
    label: "número do cartão",
    input: cardNumberInput,
    hint: document.getElementById("cardNumberHint"),
    step: 2,
    validate: (value) => value.replace(/\D/g, "").length === 16,
    format: (value) => {
      const numbers = value.replace(/\D/g, "");
      return numbers.replace(/(\d{4})(?=\d)/g, "$1 ");
    },
    question:
      "Agora os dados do cartão. Diga o número do cartão com 16 dígitos.",
    confirmation: (value) =>
      `Cartão final: ${value.slice(-4)}. Está correto? Diga sim ou não.`,
  },
  {
    name: "cardName",
    label: "nome do titular",
    input: cardNameInput,
    hint: document.getElementById("cardNameHint"),
    step: 2,
    validate: (value) => value.length > 2,
    format: (value) => value.toUpperCase(),
    question: "Diga o nome impresso no cartão.",
    confirmation: (value) =>
      `Titular: ${value}. Está correto? Diga sim ou não.`,
  },
  {
    name: "cardExpiry",
    label: "validade",
    input: cardExpiryInput,
    hint: document.getElementById("cardExpiryHint"),
    step: 2,
    validate: (value) => value.replace(/\D/g, "").length === 4,
    format: (value) => {
      const numbers = value.replace(/\D/g, "");
      return numbers.slice(0, 2) + "/" + numbers.slice(2);
    },
    question: "Diga a validade do cartão. Mês e ano, 4 dígitos.",
    confirmation: (value) =>
      `Validade: ${value}. Está correto? Diga sim ou não.`,
  },
  {
    name: "cardCvv",
    label: "CVV",
    input: cardCvvInput,
    hint: document.getElementById("cardCvvHint"),
    step: 2,
    validate: (value) => {
      const numbers = value.replace(/\D/g, "");
      return numbers.length === 3 || numbers.length === 4;
    },
    format: (value) => value.replace(/\D/g, ""),
    question: "Por último, diga o CVV, código de 3 ou 4 dígitos.",
    confirmation: (value) => `CVV registrado. Está correto? Diga sim ou não.`,
  },
];

// ============================================
// FUNÇÕES DE SÍNTESE DE VOZ
// ============================================

function speak(text, priority = false) {
  return new Promise((resolve) => {
    if (!SpeechSynthesis) {
      resolve();
      return;
    }

    // Se priority, cancela fala anterior
    if (priority) {
      SpeechSynthesis.cancel();
    }

    isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      isSpeaking = false;
      resolve();
    };

    utterance.onerror = () => {
      isSpeaking = false;
      resolve();
    };

    SpeechSynthesis.speak(utterance);
  });
}

// ============================================
// FUNÇÕES DE UI
// ============================================

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = "toast show" + (isError ? " error" : "");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

function updateVoiceStatus(text, className = "") {
  voiceStatus.textContent = text;
  voiceStatus.className = "voice-status " + className;
  liveRegion.textContent = text;
}

function markFieldFilled(input) {
  input.classList.add("filled");
  const parent = input.parentElement;
  const hint = parent.querySelector(".hint");
  if (hint) {
    hint.textContent = "✓ Preenchido";
    hint.className = "hint success";
  }
}

function highlightField(input) {
  const parent = input.parentElement;
  parent.classList.add("editing");

  setTimeout(() => {
    parent.classList.remove("editing");
  }, 1500);
}

// ============================================
// SENSOR DE ÁUDIO VISUAL
// ============================================

async function initAudioVisualizer() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    microphone.connect(analyser);

    visualize();
  } catch (error) {
    console.error("Erro ao inicializar visualizador de áudio:", error);
  }
}

function visualize() {
  if (!analyser) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animationFrame = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    // Calcula volume médio
    const average = dataArray.reduce((a, b) => a + b) / bufferLength;

    // Ativa visualizador se detectar som
    if (average > 30) {
      audioVisualizer.classList.add("active");
    } else {
      audioVisualizer.classList.remove("active");
    }
  }

  draw();
}

// ============================================
// CONTROLE DE FLUXO SEQUENCIAL
// ============================================

function goToStep(stepNumber) {
  // Remove active de todos
  document
    .querySelectorAll(".step")
    .forEach((s) => s.classList.remove("active"));

  // Adiciona active na etapa atual
  const targetStep = document.querySelector(`[data-step="${stepNumber}"]`);
  if (targetStep) {
    targetStep.classList.add("active");
  }
}

async function askNextField() {
  if (currentField >= fieldSequence.length) {
    // Todos os campos preenchidos, ir para confirmação
    await showFinalConfirmation();
    return;
  }

  const field = fieldSequence[currentField];
  currentFieldName = field.name;

  // Muda de step se necessário
  goToStep(field.step);

  // Destaca o campo atual
  highlightField(field.input);

  // Atualiza hint
  field.hint.textContent = "🎤 Aguardando sua resposta...";
  field.hint.className = "hint";

  // Pergunta ao usuário
  updateVoiceStatus(`🎤 ${field.label.toUpperCase()}`, "listening");
  await speak(field.question, true);

  waitingConfirmation = false;
}

async function confirmField(value) {
  const field = fieldSequence[currentField];

  waitingConfirmation = true;
  lastCapturedData = value;

  // Atualiza interface
  field.input.value = value;
  field.hint.textContent = "⏳ Aguardando confirmação...";
  field.hint.className = "hint";

  updateVoiceStatus("❓ Confirme os dados", "confirming");
  await speak(field.confirmation(value), true);
}

async function handleConfirmation(isConfirmed) {
  const field = fieldSequence[currentField];

  if (isConfirmed) {
    // Confirma e salva o dado
    paymentData[field.name] = lastCapturedData;
    field.input.value = lastCapturedData;
    markFieldFilled(field.input);

    showToast(`✓ ${field.label} confirmado`);
    await speak("Confirmado!");

    // Avança para próximo campo
    currentField++;
    waitingConfirmation = false;
    lastCapturedData = "";

    // Pequena pausa antes de perguntar o próximo
    setTimeout(() => {
      askNextField();
    }, 1500);
  } else {
    // Repete a pergunta
    field.hint.textContent = "🔄 Vamos tentar novamente...";
    await speak("Vamos tentar novamente.");

    waitingConfirmation = false;
    lastCapturedData = "";

    setTimeout(() => {
      askNextField();
    }, 1500);
  }
}

async function showFinalConfirmation() {
  goToStep(3);

  const confirmData = document.getElementById("confirmData");
  confirmData.innerHTML = `
    <div><span>Nome:</span> <strong>${paymentData.name}</strong></div>
    <div><span>E-mail:</span> <strong>${paymentData.email}</strong></div>
    <div><span>CPF:</span> <strong>${paymentData.cpf}</strong></div>
    <div><span>Cartão:</span> <strong>**** **** **** ${paymentData.cardNumber
      .replace(/\D/g, "")
      .slice(-4)}</strong></div>
    <div><span>Titular:</span> <strong>${paymentData.cardName}</strong></div>
    <div><span>Produto:</span> <strong>${paymentData.productName}</strong></div>
    <div><span>Total:</span> <strong style="color: #4f46e5; font-size: 1.3rem;">${
      paymentData.productValue
    }</strong></div>
  `;

  updateVoiceStatus("✅ Revisão final", "confirming");
  await speak(
    "Todos os dados foram preenchidos. Vou ler um resumo da sua compra.",
    true
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await speak(`Nome: ${paymentData.name}.`);
  await speak(`CPF: ${paymentData.cpf}.`);
  await speak(`Email: ${paymentData.email}.`);
  await speak(
    `Cartão final: ${paymentData.cardNumber.replace(/\D/g, "").slice(-4)}.`
  );
  await speak(`Titular: ${paymentData.cardName}.`);
  await speak(`Produto: ${paymentData.productName}.`);
  await speak(`Valor total: ${paymentData.productValue}.`);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await speak(
    "Para finalizar a compra, diga: confirmar pagamento. Ou diga: cancelar, para recomeçar.",
    true
  );
}

// ============================================
// PROCESSAMENTO DE COMANDOS
// ============================================

async function processCommand(command) {
  const originalCommand = command;
  command = command.toLowerCase().trim();

  console.log("═══════════════════════════════════════");
  console.log("📥 COMANDO RECEBIDO:", originalCommand);
  console.log("📊 Estado:", {
    currentField: currentField,
    waitingConfirmation: waitingConfirmation,
    isSpeaking: isSpeaking,
    fieldName:
      currentField < fieldSequence.length
        ? fieldSequence[currentField].name
        : "final",
  });
  console.log("═══════════════════════════════════════");

  // Ignora comandos enquanto está falando
  if (isSpeaking) {
    console.log("⏸️ Sistema falando, ignorando comando");
    return;
  }

  updateVoiceStatus("🎤 Processando...", "processing");

  // COMANDO: Sair/Finalizar - para tudo
  if (
    command.includes("sair") ||
    command.includes("finalizar") ||
    command.includes("encerrar")
  ) {
    console.log("🚪 Comando SAIR detectado");
    if (recognition) {
      recognition.stop();
    }
    await speak("Encerrando sistema. Obrigado por usar TrustPay!", true);
    setTimeout(() => {
      window.close();
    }, 2000);
    return;
  }

  // Se está na tela de confirmação final
  if (currentField >= fieldSequence.length) {
    console.log("📋 Na tela de confirmação final");
    if (command.includes("confirmar")) {
      console.log("✅ Confirmando pagamento");
      await confirmPayment();
      return;
    }
    if (command.includes("cancelar") || command.includes("recomeçar")) {
      console.log("🔄 Reiniciando");
      resetPayment();
      return;
    }
    console.log("⚠️ Comando não reconhecido na confirmação final");
    return;
  }

  // Se está aguardando confirmação (sim/não)
  if (waitingConfirmation) {
    console.log("⏳ Aguardando confirmação SIM/NÃO");
    console.log("Último dado capturado:", lastCapturedData);

    if (
      command.includes("sim") ||
      command.includes("confirmo") ||
      command.includes("correto") ||
      command.includes("confirmar")
    ) {
      console.log("✅ Confirmação: SIM");
      await handleConfirmation(true);
      return;
    }
    if (
      command.includes("não") ||
      command.includes("nao") ||
      command.includes("errado") ||
      command.includes("repetir")
    ) {
      console.log("❌ Confirmação: NÃO");
      await handleConfirmation(false);
      return;
    }
    // Se não entendeu, repete a confirmação
    console.log("⚠️ Não entendeu SIM/NÃO, repetindo...");
    await speak(
      "Não entendi. Por favor, diga sim para confirmar ou não para repetir.",
      true
    );
    return;
  }

  // Se está coletando um campo
  const field = fieldSequence[currentField];
  console.log("📝 Coletando campo:", field.name);
  console.log("📝 Valor bruto capturado:", command);

  // Extrai o valor do comando (usa o comando original para manter capitalização)
  let value = originalCommand.trim();

  console.log("🔧 Formatando valor...");
  // Formata o valor
  value = field.format(value);
  console.log("✨ Valor formatado:", value);

  // Valida
  console.log("🔍 Validando...");
  const isValid = field.validate(value);
  console.log("Validação:", isValid ? "✅ VÁLIDO" : "❌ INVÁLIDO");

  if (isValid) {
    console.log("✅ Valor aceito, indo para confirmação");
    await confirmField(value);
  } else {
    console.log("❌ Valor rejeitado");
    showToast(`${field.label} inválido, tente novamente`, true);
    field.hint.textContent = "❌ Dado inválido, repita por favor";
    field.hint.className = "hint error";

    await speak(`Desculpe, ${field.label} inválido. ${field.question}`, true);
  }

  // Restaura status
  setTimeout(() => {
    if (!isSpeaking) {
      updateVoiceStatus("🎤 Microfone ativo", "listening");
    }
  }, 1000);
}

// ============================================
// CONFIRMAÇÃO E PROCESSAMENTO DO PAGAMENTO
// ============================================

async function confirmPayment() {
  updateVoiceStatus("⏳ Processando pagamento...", "confirming");
  await speak("Processando seu pagamento. Aguarde um momento.", true);

  // Simula processamento
  await new Promise((resolve) => setTimeout(resolve, 3000));

  document.querySelectorAll(".step").forEach((s) => (s.style.display = "none"));
  successStep.style.display = "block";

  const now = new Date();
  document.getElementById("transactionDate").textContent = now.toLocaleString(
    "pt-BR",
    {
      dateStyle: "long",
      timeStyle: "short",
    }
  );

  updateVoiceStatus("✅ Pagamento aprovado!", "success");
  await speak("Pagamento aprovado com sucesso!", true);
  await speak(
    "Diga nova compra para fazer outra transação ou sair para encerrar."
  );
  showToast("✅ Pagamento aprovado!");
}

function resetPayment() {
  speak("Reiniciando sistema...", true);

  // NÃO para o reconhecimento - mantém microfone aberto

  // Limpa dados
  Object.keys(paymentData).forEach((key) => {
    if (!["productName", "productValue"].includes(key)) {
      paymentData[key] = "";
    }
  });

  // Limpa campos
  [
    nameInput,
    emailInput,
    cpfInput,
    cardNumberInput,
    cardNameInput,
    cardExpiryInput,
    cardCvvInput,
  ].forEach((input) => {
    input.value = "";
    input.classList.remove("filled");
  });

  // Limpa hints
  fieldSequence.forEach((field) => {
    field.hint.textContent = "";
    field.hint.className = "hint";
  });

  // Reseta controle
  currentField = 0;
  waitingConfirmation = false;
  lastCapturedData = "";

  // Volta para step 1
  successStep.style.display = "none";
  goToStep(1);

  showToast("Sistema reiniciado");

  // Reinicia fluxo mantendo o microfone aberto
  setTimeout(() => {
    askNextField();
  }, 1500);
}

// ============================================
// AJUDA
// ============================================

async function showHelp() {
  console.log("❓ AJUDA ACIONADA");

  const helpText = `
    Sistema de pagamento por voz.
    O sistema vai perguntar cada dado, você responde, e confirma com sim ou não.
    A qualquer momento você pode dizer: cancelar para recomeçar, ou sair para encerrar.
  `;

  await speak(helpText, true);
  showToast("Ajuda reproduzida");

  // Se o fluxo ainda não começou (currentField = 0 e nenhum campo preenchido), inicia
  if (currentField === 0 && !paymentData.name && !waitingConfirmation) {
    console.log("🚀 Iniciando fluxo após ajuda...");
    setTimeout(() => {
      askNextField();
    }, 1000);
  }
}

helpBtn.addEventListener("click", showHelp);

// ============================================
// RECONHECIMENTO DE VOZ CONTÍNUO
// ============================================

function startContinuousRecognition() {
  if (!recognition) {
    updateVoiceStatus("❌ Reconhecimento de voz não disponível", "error");
    speak("Desculpe, seu navegador não suporta reconhecimento de voz.");
    return;
  }

  // Se já está ouvindo, não tenta iniciar novamente
  if (isListening) {
    console.log("✓ Microfone já está ativo");
    return;
  }

  try {
    recognition.start();
    console.log("🎤 Iniciando microfone...");
    // Reseta contador quando consegue iniciar
    restartAttempts = 0;
  } catch (e) {
    // Se der erro de "já iniciado", ignora
    if (e.message && e.message.includes("started")) {
      console.log("✓ Microfone já estava ativo");
      isListening = true;
    } else {
      console.error("❌ Erro ao iniciar:", e);
    }
  }
}

function setupRecognition() {
  if (!SpeechRecognition) {
    console.error("Reconhecimento de voz não suportado");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = true; // Mantém microfone sempre aberto
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    updateVoiceStatus("🎤 Microfone ativo", "listening");
    console.log("✓ Microfone aberto e pronto");
  };

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const command = result[0].transcript;
    const confidence = result[0].confidence;

    console.log("═══════════════════════════════════════");
    console.log("🎤 VOZ CAPTURADA");
    console.log("Texto:", command);
    console.log("Confiança:", (confidence * 100).toFixed(0) + "%");
    console.log("Final?", result.isFinal);
    console.log("═══════════════════════════════════════");

    // Processa comando mesmo com confiança baixa (para melhorar captura)
    if (confidence > 0.3) {
      processCommand(command);
    } else {
      console.log("⚠️ Confiança muito baixa, ignorando");
      showToast("Não entendi, pode repetir?", true);
    }
  };

  recognition.onerror = (event) => {
    console.error("❌ Erro no reconhecimento:", event.error);

    // Ignora erro de "no-speech" - é normal quando ninguém está falando
    if (event.error === "no-speech") {
      console.log("Silêncio detectado, continuando escuta...");
      return;
    }

    // Erro de permissão - crítico
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      updateVoiceStatus("❌ Permissão de microfone negada", "error");
      showToast("Permita o acesso ao microfone nas configurações", true);
      speak(
        "Acesso ao microfone foi negado. Por favor, permita o acesso nas configurações do navegador.",
        true
      );
      return;
    }

    // Erro de rede - tenta reconectar uma vez
    if (event.error === "network") {
      console.log("⚠️ Erro de rede, tentando reconectar...");
      setTimeout(() => {
        if (!isListening) {
          startContinuousRecognition();
        }
      }, 2000);
      return;
    }

    // Outros erros - apenas loga, não reinicia
    console.log("⚠️ Erro temporário:", event.error);
  };

  recognition.onend = () => {
    console.log("⚠️ Reconhecimento encerrou inesperadamente");
    isListening = false;

    // Só reinicia se estiver dentro do limite E não for um encerramento intencional
    if (restartAttempts < maxRestartAttempts) {
      restartAttempts++;
      console.log(
        `🔄 Reconectando microfone... (${restartAttempts}/${maxRestartAttempts})`
      );

      // Espera um pouco mais antes de reconectar para evitar loop
      setTimeout(() => {
        startContinuousRecognition();
      }, 1000);
    } else {
      console.log("❌ Limite de reconexões atingido");
      updateVoiceStatus("⚠️ Microfone desconectado", "error");
      showToast("Microfone desconectou. Recarregue a página.", true);
      speak(
        "O microfone foi desconectado. Por favor, recarregue a página.",
        true
      );
    }
  };
}

// ============================================
// INICIALIZAÇÃO
// ============================================

startBtn.addEventListener("click", async () => {
  console.log("🚀 BOTÃO INICIAR CLICADO");

  // Esconde tela inicial
  startScreen.style.display = "none";
  main.style.display = "block";

  console.log("📱 Tela alterada, iniciando áudio...");

  // Inicializa áudio (necessário após interação do usuário)
  await initAudioVisualizer();

  console.log("🎤 Áudio inicializado, configurando reconhecimento...");

  // Configura reconhecimento
  setupRecognition();

  console.log("⚙️ Reconhecimento configurado");

  // Garante que a síntese de voz está pronta (importante no mobile)
  if (SpeechSynthesis.getVoices().length === 0) {
    console.log("⏳ Aguardando vozes carregarem...");
    await new Promise((resolve) => {
      SpeechSynthesis.addEventListener("voiceschanged", resolve, {
        once: true,
      });
      setTimeout(resolve, 1000); // Fallback se evento não disparar
    });
  }

  console.log("🗣️ Vozes prontas, iniciando fluxo...");

  // Inicia reconhecimento automático
  setTimeout(() => {
    console.log("🎤 Iniciando reconhecimento contínuo...");
    startContinuousRecognition();

    // Aguarda reconhecimento iniciar e então começa o fluxo
    setTimeout(async () => {
      console.log("👋 Falando boas-vindas...");
      await speak(
        "Bem-vindo ao TrustPay! Sistema de pagamento por voz ativado.",
        true
      );
      await speak(
        "Vou te guiar passo a passo. Responda cada pergunta e confirme com sim ou não.",
        true
      );

      // Inicia o fluxo sequencial
      console.log("📋 Iniciando primeira pergunta...");
      setTimeout(() => {
        askNextField();
      }, 500);
    }, 1500);
  }, 500);
});

// ============================================
// TRATAMENTO DE SAÍDA
// ============================================

window.addEventListener("beforeunload", () => {
  if (recognition) {
    recognition.stop();
  }
  if (audioContext) {
    audioContext.close();
  }
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});
