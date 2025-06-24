// Animações botões, por Mike Quinn.
// Link Hover Effects w/ mo.js. Fonte: https://codepen.io/mprquinn/pen/OmOMrR
const links = document.querySelectorAll(".action-buttons button");

links.forEach((link) => link.addEventListener("click", shootLines)); // "mouseenter" ou "click"

function shootLines(e) {
  const itemDim = this.getBoundingClientRect(),
    itemSize = {
      x: itemDim.right - itemDim.left,
      y: itemDim.bottom - itemDim.top
    },
    shapes = ["line", "zigzag"],
    colors = ["#2FB5F3", "#FF0A47", "#FF0AC2", "#47FF0A"];

  const chosenC = Math.floor(Math.random() * colors.length),
    chosenS = Math.floor(Math.random() * shapes.length);

  // create shape
  const burst = new mojs.Burst({
    left: itemDim.left + itemSize.x / 2,
    top: itemDim.top + itemSize.y / 2,
    radiusX: itemSize.x,
    radiusY: itemSize.y,
    count: 8,

    children: {
      shape: shapes[chosenS],
      radius: 10,
      scale: { 0.8: 1 },
      fill: "none",
      points: 7,
      stroke: colors[chosenC],
      strokeDasharray: "100%",
      strokeDashoffset: { "-100%": "100%" },
      duration: 350,
      delay: 100,
      easing: "quad.out",
      isShowEnd: false
    }
  });

  burst.play();
}

const button = document.getElementById("blur-mode-btn");
const openEye = document.getElementById("openEye");
const closedEye = document.getElementById("closedEye");

let eyeOpen = true;

button.addEventListener("click", () => {
  // animação de piscar
  if (eyeOpen) {
    openEye.classList.add("blink");
    setTimeout(() => {
      openEye.style.display = "none";
      openEye.style.opacity = "0";
      closedEye.style.display = "block";
      closedEye.style.opacity = "1";
    }, 300);
  } else {
    closedEye.classList.add("blink");
    setTimeout(() => {
      closedEye.style.display = "none";
      closedEye.style.opacity = "0";
      openEye.style.display = "block";
      openEye.style.opacity = "1";
    }, 300);
  }

  // efeito de quadrinhos (centralizado)
  const effect = document.createElement("div");
  effect.className = "comic-effect";
  effect.textContent = "*PISC*";
  button.querySelector(".eye-container").appendChild(effect);
  setTimeout(() => {
    effect.remove();
  }, 400);

  // troca de estado
  eyeOpen = !eyeOpen;

  // remove a classe de animação após completar
  setTimeout(() => {
    openEye.classList.remove("blink");
    closedEye.classList.remove("blink");
  }, 600);
});

const HANDLE_SIZE = 16;
const HANDLE_TYPES = {
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_RIGHT: "bottom-right",
  TOP: "top",
  RIGHT: "right",
  BOTTOM: "bottom",
  LEFT: "left"
};

document.addEventListener("DOMContentLoaded", function () {
  // Elementos do DOM
  const elements = {
    jsonInput: document.getElementById("json-input"),
    imageDirectoryInput: document.getElementById("image-directory"),
    saveBtn: document.getElementById("save-btn"),
    drawModeBtn: document.getElementById("draw-mode-btn"),
    mergePanelsBtn: document.getElementById("merge-panels-btn"),
    undoBtn: document.getElementById("undo-btn"),
    redoBtn: document.getElementById("redo-btn"),
    canvas: document.getElementById("comic-canvas"),
    panelsList: document.getElementById("panels-list"),
    propertiesForm: document.getElementById("properties-form"),
    addPanelBtn: document.getElementById("add-panel-btn"),
    prevPageBtn: document.getElementById("prev-page-btn"),
    nextPageBtn: document.getElementById("next-page-btn"),
    blurModeBtn: document.getElementById("blur-mode-btn"),
    mouseCoordsDisplay: document.getElementById("mouse-coords"),
    pageSelect: document.getElementById("page-select")
  };

  const ctx = elements.canvas.getContext("2d");

  // Estado da aplicação
  const state = {
    comicData: null,
    images: [],
    imageFilesMap: {},
    currentPageIndex: 0,
    selectedPanelIndex: -1,
    selectedPanelsForMerge: [],
    isDrawing: false,
    isDrawMode: false,
    isMergeMode: false,
    startX: 0,
    startY: 0,
    history: [],
    historyIndex: -1,
    effectMode: true, // true para ativar o efeito, false para desativar
    effectType: "pixelate", // 'blur' ou 'pixelate'
    effectSize: 64, // Tamanho/intensidade do efeito
    mousePosition: { x: 0, y: 0 }, // Novo estado para armazenar posição do mouse
    resizingHandle: null,
    originalPanelState: null,
    draggingPanel: false,
    dragStartX: 0,
    dragStartY: 0,
    zoomMode: false,
    zoomedPanelIndex: -1,
    showPanelBorders: false,
    panelBlur: true
  };

  const buttons = document.querySelectorAll(".action-buttons button");

  function setRandomRotation(button) {
    num = 5; // Rotação de -num a num graus
    const randomDeg = Math.random() * (num * 2) - num;
    button.style.transform = `rotate(${randomDeg}deg)`;
  }

  buttons.forEach((button) => {
    // Ao entrar com o mouse: aplica rotação aleatória
    button.addEventListener("mouseenter", () => setRandomRotation(button));
    // Ao sair com o mouse: volta ao 0 grau
    button.addEventListener("mouseleave", () => {
      button.style.transform = "rotate(0deg)";
    });
  });

  // Inicialização
  initEventListeners();

  function initEventListeners() {
    // Carregar JSON
    elements.jsonInput.addEventListener("change", handleJsonInput);

    // Carregar diretório de imagens
    elements.imageDirectoryInput.addEventListener(
      "change",
      handleImageDirectoryInput
    );

    // Botões de controle
    elements.drawModeBtn.addEventListener("click", toggleDrawMode);
    elements.mergePanelsBtn.addEventListener("click", toggleMergeMode);
    elements.undoBtn.addEventListener("click", undoAction);
    elements.redoBtn.addEventListener("click", redoAction);
    elements.addPanelBtn.addEventListener("click", addNewPanel);
    elements.prevPageBtn.addEventListener("click", goToPreviousPage);
    elements.nextPageBtn.addEventListener("click", goToNextPage);
    elements.saveBtn.addEventListener("click", saveComicData);
    elements.blurModeBtn.addEventListener("click", toggleBlurMode);

    // Eventos do canvas
    elements.canvas.addEventListener("mousedown", handleCanvasMouseDown);
    elements.canvas.addEventListener("mousemove", handleCanvasMouseMove);
    elements.canvas.addEventListener("mouseup", handleCanvasMouseUp);
    elements.canvas.addEventListener("mouseout", handleCanvasMouseOut);

    // Atalhos de teclado
    document.addEventListener("keydown", handleKeyboardShortcuts);
  }

  function handleJsonInput(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const newComicData = JSON.parse(e.target.result);
      saveState();
      state.comicData = newComicData;
      updatePageSelector();
      loadImages();
    };
    reader.readAsText(file);
  }

  function handleImageDirectoryInput(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    state.imageFilesMap = {};
    files.forEach((file) => {
      state.imageFilesMap[file.name] = file;
    });

    if (state.comicData) {
      loadImages();
    }
  }

  function loadImages() {
    if (!state.comicData || Object.keys(state.imageFilesMap).length === 0)
      return;

    // Define a página inicial
    state.currentPageIndex = getPageFromUrl();

    state.images = [];
    let loadedCount = 0;

    state.comicData.forEach((pageData, index) => {
      const fileName = pageData.filename;
      const file = state.imageFilesMap[fileName];

      if (!file) {
        console.warn(`Arquivo de imagem não encontrado: ${fileName}`);
        state.images[index] = null;
        loadedCount++;
        checkAllImagesLoaded(loadedCount);
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          state.images[index] = img;
          loadedCount++;
          checkAllImagesLoaded(loadedCount);

          if (index === 0 && loadedCount === 1) {
            displayCurrentPage();
          }
        };
        img.onerror = function () {
          console.error(`Erro ao carregar imagem: ${fileName}`);
          state.images[index] = null;
          loadedCount++;
          checkAllImagesLoaded(loadedCount);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
    updatePageSelector();
  }

  function checkAllImagesLoaded(loadedCount) {
    if (loadedCount === state.comicData.length) {
      updateNavButtons();
    }
  }

  function applyEffect(
    context,
    x,
    y,
    width,
    height,
    effectType,
    effectSize = 8
  ) {
    context.save();

    if (effectType === "pixelate") {
      // Efeito de pixelização
      const smallWidth = Math.floor(width / effectSize);
      const smallHeight = Math.floor(height / effectSize);

      context.imageSmoothingEnabled = false;
      context.drawImage(
        context.canvas,
        x,
        y,
        width,
        height,
        x,
        y,
        smallWidth,
        smallHeight
      );

      context.drawImage(
        context.canvas,
        x,
        y,
        smallWidth,
        smallHeight,
        x,
        y,
        width,
        height
      );
    } else if (effectType === "blur") {
      // Efeito de blur usando canvas temporário
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");

      // Desenhar a área específica no canvas temporário
      tempCtx.drawImage(
        context.canvas,
        x,
        y,
        width,
        height,
        0,
        0,
        width,
        height
      );

      // Aplicar blur
      tempCtx.filter = `blur(${effectSize}px)`;
      tempCtx.drawImage(tempCanvas, 0, 0);
      tempCtx.filter = "none";

      // Desenhar de volta no canvas original
      context.drawImage(tempCanvas, 0, 0, width, height, x, y, width, height);
    }

    context.restore();
  }

  function getHandleRects(panel) {
    return {
      [HANDLE_TYPES.TOP_LEFT]: {
        x: panel[0] - HANDLE_SIZE / 2,
        y: panel[1] - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE
      },
      [HANDLE_TYPES.TOP_RIGHT]: {
        x: panel[0] + panel[2] - HANDLE_SIZE / 2,
        y: panel[1] - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE
      },
      [HANDLE_TYPES.BOTTOM_LEFT]: {
        x: panel[0] - HANDLE_SIZE / 2,
        y: panel[1] + panel[3] - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE
      },
      [HANDLE_TYPES.BOTTOM_RIGHT]: {
        x: panel[0] + panel[2] - HANDLE_SIZE / 2,
        y: panel[1] + panel[3] - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE
      },
      [HANDLE_TYPES.TOP]: {
        x: panel[0] + panel[2] / 2 - HANDLE_SIZE / 2,
        y: panel[1] - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE
      },
      [HANDLE_TYPES.RIGHT]: {
        x: panel[0] + panel[2] - HANDLE_SIZE / 2,
        y: panel[1] + panel[3] / 2 - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE
      },
      [HANDLE_TYPES.BOTTOM]: {
        x: panel[0] + panel[2] / 2 - HANDLE_SIZE / 2,
        y: panel[1] + panel[3] - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE
      },
      [HANDLE_TYPES.LEFT]: {
        x: panel[0] - HANDLE_SIZE / 2,
        y: panel[1] + panel[3] / 2 - HANDLE_SIZE / 2,
        width: HANDLE_SIZE,
        height: HANDLE_SIZE
      }
    };
  }

  function drawHandles(panel) {
    const handles = getHandleRects(panel);

    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;

    Object.values(handles).forEach((handle) => {
      ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
      ctx.strokeRect(handle.x, handle.y, handle.width, handle.height);
    });

    ctx.restore();
  }

  function getHandleAtPosition(panel, x, y) {
    const BORDER_TOLERANCE = 10; // Distância em pixels para considerar clique na borda
    const isLeftEdge = Math.abs(x - panel[0]) <= BORDER_TOLERANCE;
    const isRightEdge = Math.abs(x - (panel[0] + panel[2])) <= BORDER_TOLERANCE;
    const isTopEdge = Math.abs(y - panel[1]) <= BORDER_TOLERANCE;
    const isBottomEdge =
      Math.abs(y - (panel[1] + panel[3])) <= BORDER_TOLERANCE;

    if (isLeftEdge && isTopEdge) return HANDLE_TYPES.TOP_LEFT;
    if (isRightEdge && isTopEdge) return HANDLE_TYPES.TOP_RIGHT;
    if (isLeftEdge && isBottomEdge) return HANDLE_TYPES.BOTTOM_LEFT;
    if (isRightEdge && isBottomEdge) return HANDLE_TYPES.BOTTOM_RIGHT;
    if (isTopEdge) return HANDLE_TYPES.TOP;
    if (isRightEdge) return HANDLE_TYPES.RIGHT;
    if (isBottomEdge) return HANDLE_TYPES.BOTTOM;
    if (isLeftEdge) return HANDLE_TYPES.LEFT;

    return null;
  }

  function displayCurrentPage() {
    if (
      !state.comicData ||
      state.comicData.length <= state.currentPageIndex ||
      !state.images[state.currentPageIndex]
    ) {
      elements.canvas.width = 0;
      elements.canvas.height = 0;
      elements.panelsList.innerHTML = "";
      elements.propertiesForm.innerHTML = "<p>Nenhuma imagem carregada</p>";
      return;
    }

    const pageData = state.comicData[state.currentPageIndex];
    const img = state.images[state.currentPageIndex];

    // Configurar canvas
    elements.canvas.width = pageData.size[0];
    elements.canvas.height = pageData.size[1];

    // Desenhar a imagem original
    ctx.drawImage(img, 0, 0, elements.canvas.width, elements.canvas.height);

    // Se o modo de efeito estiver ativo, aplicar o efeito selecionado nos painéis
    if (state.effectMode && state.effectType) {
      pageData.panels.forEach((panel) => {
        ctx.save();
        // Recortar a área do painel
        ctx.beginPath();
        ctx.rect(panel[0], panel[1], panel[2], panel[3]);
        ctx.clip();
        // Aplicar o efeito selecionado
        applyEffect(
          ctx,
          panel[0],
          panel[1],
          panel[2],
          panel[3],
          state.effectType,
          state.effectSize || 8
        );
        ctx.restore();
      });
    }

    // Desenhar os contornos dos painéis
    pageData.panels.forEach((panel, i) => {
      ctx.strokeStyle =
        i === state.selectedPanelIndex
          ? "#FF0000"
          : state.selectedPanelsForMerge.includes(i)
            ? "#FF8C00"
            : "#00FF00";
      ctx.lineWidth =
        i === state.selectedPanelIndex ||
          state.selectedPanelsForMerge.includes(i)
          ? 4
          : 2;
      ctx.strokeRect(panel[0], panel[1], panel[2], panel[3]);

      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = "bold 18px Arial";
      ctx.fillText((i + 1).toString(), panel[0] + 8, panel[1] + 22);
    });

    // Desenhar os painéis e contornos
    pageData.panels.forEach((panel, i) => {
      // Desenhar alças apenas para o painel selecionado
      if (i === state.selectedPanelIndex) {
        drawHandles(panel);
      }
    });

    if (state.zoomMode && state.zoomedPanelIndex !== -1) {
      const zoomedPanel = pageData.panels[state.zoomedPanelIndex];

      const zoomCanvas = document.createElement('canvas');
      zoomCanvas.width = zoomedPanel[2];
      zoomCanvas.height = zoomedPanel[3];
      const zoomCtx = zoomCanvas.getContext('2d');

      const effectSize = state.effectSize || 8;

      if (state.panelBlur && state.effectType === 'blur') {
        zoomCtx.filter = `blur(${effectSize}px)`;
        zoomCtx.drawImage(
          img,
          zoomedPanel[0], zoomedPanel[1], zoomedPanel[2], zoomedPanel[3],
          0, 0, zoomedPanel[2], zoomedPanel[3]
        );
      } else if (state.panelBlur && state.effectType === 'pixelate') {
        // Pixelate: desenha pequeno e escala para criar blocos
        const pixelCanvas = document.createElement('canvas');
        const pixelCtx = pixelCanvas.getContext('2d');

        pixelCanvas.width = Math.floor(zoomedPanel[2] / effectSize);
        pixelCanvas.height = Math.floor(zoomedPanel[3] / effectSize);

        pixelCtx.imageSmoothingEnabled = false;

        // Desenha versão reduzida
        pixelCtx.drawImage(
          img,
          zoomedPanel[0], zoomedPanel[1], zoomedPanel[2], zoomedPanel[3],
          0, 0, pixelCanvas.width, pixelCanvas.height
        );

        // Desenha versão pixelada ampliada no canvas principal
        zoomCtx.imageSmoothingEnabled = false;
        zoomCtx.drawImage(
          pixelCanvas,
          0, 0, pixelCanvas.width, pixelCanvas.height,
          0, 0, zoomedPanel[2], zoomedPanel[3]
        );
      } else {
        // Sem efeito: desenha normalmente
        zoomCtx.filter = 'none';
        zoomCtx.drawImage(
          img,
          zoomedPanel[0], zoomedPanel[1], zoomedPanel[2], zoomedPanel[3],
          0, 0, zoomedPanel[2], zoomedPanel[3]
        );
      }

      // Calcula proporção com margem
      const marginRatio = 0.04;
      const availableWidth = elements.canvas.width * (1 - 2 * marginRatio);
      const availableHeight = elements.canvas.height * (1 - 2 * marginRatio);

      const panelAspect = zoomedPanel[2] / zoomedPanel[3];
      const canvasAspect = availableWidth / availableHeight;

      let scaledWidth, scaledHeight;
      if (panelAspect > canvasAspect) {
        scaledWidth = availableWidth;
        scaledHeight = availableWidth / panelAspect;
      } else {
        scaledHeight = availableHeight;
        scaledWidth = availableHeight * panelAspect;
      }

      const centerX = (elements.canvas.width - scaledWidth) / 2;
      const centerY = (elements.canvas.height - scaledHeight) / 2;

      ctx.save();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);

      ctx.drawImage(
        zoomCanvas,
        0, 0, zoomedPanel[2], zoomedPanel[3],
        centerX, centerY, scaledWidth, scaledHeight
      );

      if (state.showPanelBorders) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX, centerY, scaledWidth, scaledHeight);

        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Painel ${state.zoomedPanelIndex + 1}`, centerX + 10, centerY + 30);
      }

      ctx.restore();
    }

    updatePanelsList();
    updatePropertiesForm();
    updateButtonStates();
    updatePageSelector();

    elements.canvas.classList.toggle("canvas-moving", state.draggingPanel);
    // Posiciona o display de coordenadas
    elements.mouseCoordsDisplay.style.display = "block";
    updateMouseCoordsDisplay();
  }

  // Função atualizada para garantir estabilidade e correções
  function updatePanelsList() {
    if (!state.comicData || state.comicData.length <= state.currentPageIndex)
      return;

    elements.panelsList.innerHTML = "";
    const panels = state.comicData[state.currentPageIndex].panels;

    panels.forEach((panel, i) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.dataset.index = i;
      li.innerHTML = `
            <span>Painel ${i + 1}: ${panel[0]}x${panel[1]} (${panel[2]}×${panel[3]
        })</span>
            <button class="delete-panel-btn">×</button>
        `;

      if (i === state.selectedPanelIndex) li.classList.add("active");
      if (state.selectedPanelsForMerge.includes(i))
        li.classList.add("merge-selected");

      li.addEventListener("click", (e) => {
        if (!e.target.classList.contains("delete-panel-btn")) {
          handlePanelSelection(i, e);
        }
      });

      li.querySelector(".delete-panel-btn").addEventListener("click", () => {
        deletePanel(i);
      });

      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", i);
        li.classList.add("dragging");
        setTimeout(() => li.classList.add("invisible"), 0);
      });

      li.addEventListener("dragend", () => {
        li.classList.remove("dragging", "invisible");
      });

      // Apenas permite o drop visual — lógica real está no evento "drop"
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      elements.panelsList.appendChild(li);
    });
  }

  elements.panelsList.addEventListener("drop", (e) => {
    e.preventDefault();

    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
    const toLi = document.elementFromPoint(e.clientX, e.clientY)?.closest("li");

    if (!toLi) return;
    const toIndex = parseInt(toLi.dataset.index);

    if (fromIndex !== toIndex && !isNaN(fromIndex) && !isNaN(toIndex)) {
      saveState();
      const panels = state.comicData[state.currentPageIndex].panels;
      const [moved] = panels.splice(fromIndex, 1);
      panels.splice(toIndex, 0, moved);

      // Atualiza seleções
      if (state.selectedPanelIndex === fromIndex)
        state.selectedPanelIndex = toIndex;
      state.selectedPanelsForMerge = state.selectedPanelsForMerge.map((i) => {
        if (i === fromIndex) return toIndex;
        if (i > fromIndex && i <= toIndex) return i - 1;
        if (i < fromIndex && i >= toIndex) return i + 1;
        return i;
      });

      displayCurrentPage();
    }
  });

  function handlePanelSelection(index, event) {
    if (state.isMergeMode) {
      if (event.shiftKey && state.selectedPanelsForMerge.length > 0) {
        const lastSelected =
          state.selectedPanelsForMerge[state.selectedPanelsForMerge.length - 1];
        const start = Math.min(lastSelected, index);
        const end = Math.max(lastSelected, index);
        state.selectedPanelsForMerge = [];
        for (let i = start; i <= end; i++) {
          state.selectedPanelsForMerge.push(i);
        }
      } else {
        const idx = state.selectedPanelsForMerge.indexOf(index);
        if (idx === -1) {
          state.selectedPanelsForMerge.push(index);
        } else {
          state.selectedPanelsForMerge.splice(idx, 1);
        }
      }

      // Garante que pelo menos um painel está selecionado no modo merge
      if (state.selectedPanelsForMerge.length === 0) {
        state.selectedPanelsForMerge = [index];
      }

      state.selectedPanelIndex = -1;
    } else {
      // Modo normal: seleção única
      state.selectedPanelIndex = index;
      state.zoomedPanelIndex = state.selectedPanelIndex;
      state.selectedPanelsForMerge = [];
    }

    displayCurrentPage();
  }

  function toggleDrawMode() {
    state.isDrawMode = !state.isDrawMode;
    elements.drawModeBtn.classList.toggle("active");

    if (state.isDrawMode) {
      elements.canvas.classList.add("canvas-draw-mode");
      state.isMergeMode = false;
      elements.mergePanelsBtn.classList.remove("active");
      state.selectedPanelsForMerge = [];
    } else {
      elements.canvas.classList.remove("canvas-draw-mode");
    }

    updateButtonStates();
    displayCurrentPage();
  }

  function toggleMergeMode() {
    state.isMergeMode = !state.isMergeMode;
    elements.mergePanelsBtn.classList.toggle("active");

    if (state.isMergeMode) {
      state.isDrawMode = false;
      elements.drawModeBtn.classList.remove("active");

      // Se já tinha painéis selecionados, converte para merge
      if (state.selectedPanelIndex !== -1) {
        state.selectedPanelsForMerge = [state.selectedPanelIndex];
        state.selectedPanelIndex = -1;
      }
    } else {
      // Ao sair do modo merge, verifica se deve juntar
      if (state.selectedPanelsForMerge.length >= 2) {
        if (confirm("Deseja juntar os painéis selecionados?")) {
          mergeSelectedPanels();
          return; // Não limpar seleção pois mergeSelectedPanels já faz isso
        }
      }
      state.selectedPanelsForMerge = [];
    }

    displayCurrentPage();
  }

  function mergeSelectedPanels() {
    if (state.selectedPanelsForMerge.length < 2) {
      alert("Selecione pelo menos 2 painéis para juntar");
      return;
    }

    saveState();

    const pageData = state.comicData[state.currentPageIndex];
    const panels = pageData.panels;

    // Ordenar os índices
    const sortedIndices = [...state.selectedPanelsForMerge].sort(
      (a, b) => a - b
    );
    const firstIndex = sortedIndices[0];

    // Calcular o retângulo que engloba todos os painéis selecionados
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    sortedIndices.forEach((index) => {
      const panel = panels[index];
      minX = Math.min(minX, panel[0]);
      minY = Math.min(minY, panel[1]);
      maxX = Math.max(maxX, panel[0] + panel[2]);
      maxY = Math.max(maxY, panel[1] + panel[3]);
    });

    // Criar novo painel combinado
    const newPanel = [minX, minY, maxX - minX, maxY - minY];

    // Remover painéis selecionados (em ordem decrescente)
    for (let i = sortedIndices.length - 1; i >= 0; i--) {
      panels.splice(sortedIndices[i], 1);
    }

    // Inserir novo painel na posição do primeiro painel removido
    panels.splice(firstIndex, 0, newPanel);

    // Resetar estados
    state.selectedPanelIndex = firstIndex;
    state.selectedPanelsForMerge = [];
    state.isMergeMode = false;
    elements.mergePanelsBtn.classList.remove("active");

    displayCurrentPage();
  }

  // Função para atualizar a exibição das coordenadas
  function updateMouseCoordsDisplay() {
    elements.mouseCoordsDisplay.textContent = `X: ${state.mousePosition.x}, Y: ${state.mousePosition.y}`;
  }

  // Função para mapear posição do mouse para coordenadas da imagem
  function getImageCoords(clientX, clientY) {
    const rect = elements.canvas.getBoundingClientRect();
    const scaleX = elements.canvas.width / rect.width;
    const scaleY = elements.canvas.height / rect.height;

    return {
      x: Math.floor((clientX - rect.left) * scaleX),
      y: Math.floor((clientY - rect.top) * scaleY)
    };
  }
  // Adicione estes event listeners:
  elements.canvas.addEventListener("mousemove", (e) => {
    const coords = getImageCoords(e.clientX, e.clientY);
    state.mousePosition = coords;
    updateMouseCoordsDisplay();
  });

  elements.canvas.addEventListener("mouseout", () => {
    elements.mouseCoordsDisplay.style.opacity = "0";
  });

  elements.canvas.addEventListener("mouseenter", () => {
    elements.mouseCoordsDisplay.style.opacity = "1";
  });

  function handleCanvasMouseDown(e) {
    if (!state.comicData || state.comicData.length <= state.currentPageIndex)
      return;

    const coords = getImageCoords(e.clientX, e.clientY);
    state.startX = coords.x;
    state.startY = coords.y;

    if (state.isDrawMode) {
      // Modo desenho (mantido igual)
      state.isDrawing = true;
      saveState();
      state.comicData[state.currentPageIndex].panels.push([
        Math.floor(state.startX),
        Math.floor(state.startY),
        0,
        0
      ]);
      state.selectedPanelIndex =
        state.comicData[state.currentPageIndex].panels.length - 1;
      displayCurrentPage();
      return;
    }

    // Verifica primeiro se clicou em uma alça do painel selecionado
    if (state.selectedPanelIndex !== -1) {
      const panel =
        state.comicData[state.currentPageIndex].panels[
        state.selectedPanelIndex
        ];

      // Verifica se clicou em uma alça de redimensionamento
      state.resizingHandle = getHandleAtPosition(panel, coords.x, coords.y);

      if (state.resizingHandle) {
        state.originalPanelState = [...panel];
        return;
      }

      // Verifica se clicou no centro do painel (área não-alça)
      const centerX = panel[0] + panel[2] / 2;
      const centerY = panel[1] + panel[3] / 2;
      const isNearCenter =
        Math.abs(coords.x - centerX) < panel[2] / 2 - HANDLE_SIZE &&
        Math.abs(coords.y - centerY) < panel[3] / 2 - HANDLE_SIZE;

      if (isNearCenter) {
        state.draggingPanel = true;
        state.dragStartX = coords.x;
        state.dragStartY = coords.y;
        state.originalPanelState = [...panel];
        return;
      }
    }

    // Se não clicou em uma alça, verifica se clicou em outro painel
    let clickedPanelIndex = -1;
    const panels = state.comicData[state.currentPageIndex].panels;

    // Verifica de trás para frente (painéis no topo primeiro)
    for (let i = panels.length - 1; i >= 0; i--) {
      const panel = panels[i];
      if (
        coords.x >= panel[0] &&
        coords.x <= panel[0] + panel[2] &&
        coords.y >= panel[1] &&
        coords.y <= panel[1] + panel[3]
      ) {
        // Verifica se o clique foi em uma alça deste painel
        const handle = getHandleAtPosition(panel, coords.x, coords.y);
        if (!handle) {
          clickedPanelIndex = i;
          break;
        }
      }
    }

    // Atualiza a seleção conforme o modo
    if (clickedPanelIndex !== -1) {
      if (state.isMergeMode) {
        if (e.shiftKey && state.selectedPanelsForMerge.length > 0) {
          const lastSelected = Math.max(...state.selectedPanelsForMerge);
          const start = Math.min(lastSelected, clickedPanelIndex);
          const end = Math.max(lastSelected, clickedPanelIndex);
          state.selectedPanelsForMerge = [];
          for (let i = start; i <= end; i++) {
            state.selectedPanelsForMerge.push(i);
          }
        } else {
          const index = state.selectedPanelsForMerge.indexOf(clickedPanelIndex);
          if (index === -1) {
            state.selectedPanelsForMerge.push(clickedPanelIndex);
          } else {
            state.selectedPanelsForMerge.splice(index, 1);
          }
        }

        state.selectedPanelIndex = -1;
      } else {
        // Seleção normal
        state.selectedPanelIndex = clickedPanelIndex;
        state.selectedPanelsForMerge = [];
      }
    } else {
      // Clicou fora de qualquer painel
      if (!state.isMergeMode) {
        state.selectedPanelIndex = -1;
      }
      state.selectedPanelsForMerge = [];
    }

    displayCurrentPage();
  }

  function getGlobalCoords(e) {
    return {
      x: e.clientX,
      y: e.clientY
    };
  }

  function handleCanvasMouseMove(e) {
    const coords = getImageCoords(e.clientX, e.clientY);
    state.mousePosition = { x: coords.x, y: coords.y };
    updateMouseCoordsDisplay();

    const rect = elements.canvas.getBoundingClientRect();
    const globalCoords = getGlobalCoords(e);

    let canvasX =
      (globalCoords.x - rect.left) * (elements.canvas.width / rect.width);
    let canvasY =
      (globalCoords.y - rect.top) * (elements.canvas.height / rect.height);

    canvasX = Math.floor(Math.max(0, Math.min(canvasX, elements.canvas.width)));
    canvasY = Math.floor(
      Math.max(0, Math.min(canvasY, elements.canvas.height))
    );

    const panel =
      state.comicData[state.currentPageIndex].panels[state.selectedPanelIndex];
    // DETECÇÃO DO CURSOR DINÂMICO
    const handle = getResizeHandleUnderMouse(canvasX, canvasY);

    if (handle) {
      elements.canvas.style.cursor = handle;
    } else if (state.draggingPanel) {
      elements.canvas.style.cursor = "grabbing";
    } else {
      elements.canvas.style.cursor = "crosshair";
    }

    if (state.isDrawing) {
      panel[0] = Math.min(state.startX, canvasX);
      panel[1] = Math.min(state.startY, canvasY);
      panel[2] = Math.abs(canvasX - state.startX);
      panel[3] = Math.abs(canvasY - state.startY);

      displayCurrentPage();
    } else if (state.resizingHandle) {
      const origLeft = state.originalPanelState[0];
      const origTop = state.originalPanelState[1];
      const origRight = origLeft + state.originalPanelState[2];
      const origBottom = origTop + state.originalPanelState[3];

      let newLeft = origLeft,
        newTop = origTop,
        newRight = origRight,
        newBottom = origBottom;

      switch (state.resizingHandle) {
        case HANDLE_TYPES.TOP_LEFT:
          newLeft = canvasX;
          newTop = canvasY;
          break;

        case HANDLE_TYPES.TOP_RIGHT:
          newRight = canvasX;
          newTop = canvasY;
          break;

        case HANDLE_TYPES.BOTTOM_LEFT:
          newLeft = canvasX;
          newBottom = canvasY;
          break;

        case HANDLE_TYPES.BOTTOM_RIGHT:
          newRight = canvasX;
          newBottom = canvasY;
          break;

        case HANDLE_TYPES.TOP:
          newTop = canvasY;
          break;

        case HANDLE_TYPES.RIGHT:
          newRight = canvasX;
          break;

        case HANDLE_TYPES.BOTTOM:
          newBottom = canvasY;
          break;

        case HANDLE_TYPES.LEFT:
          newLeft = canvasX;
          break;
      }

      // Corrige direção para evitar negativos
      const left = Math.min(newLeft, newRight);
      const right = Math.max(newLeft, newRight);
      const top = Math.min(newTop, newBottom);
      const bottom = Math.max(newTop, newBottom);

      panel[0] = left;
      panel[1] = top;
      panel[2] = right - left;
      panel[3] = bottom - top;

      // Aplica tamanho mínimo
      const MIN_SIZE = 20;

      if (panel[2] < MIN_SIZE) {
        if (
          state.resizingHandle === HANDLE_TYPES.LEFT ||
          state.resizingHandle === HANDLE_TYPES.TOP_LEFT ||
          state.resizingHandle === HANDLE_TYPES.BOTTOM_LEFT
        ) {
          panel[0] = panel[0] + panel[2] - MIN_SIZE;
        }
        panel[2] = MIN_SIZE;
      }

      if (panel[3] < MIN_SIZE) {
        if (
          state.resizingHandle === HANDLE_TYPES.TOP ||
          state.resizingHandle === HANDLE_TYPES.TOP_LEFT ||
          state.resizingHandle === HANDLE_TYPES.TOP_RIGHT
        ) {
          panel[1] = panel[1] + panel[3] - MIN_SIZE;
        }
        panel[3] = MIN_SIZE;
      }

      // Garante que não ultrapasse canvas
      panel[0] = Math.max(0, Math.min(panel[0], elements.canvas.width));
      panel[1] = Math.max(0, Math.min(panel[1], elements.canvas.height));
      panel[2] = Math.min(panel[2], elements.canvas.width - panel[0]);
      panel[3] = Math.min(panel[3], elements.canvas.height - panel[1]);

      displayCurrentPage();
    } else if (state.draggingPanel) {
      const coords = getImageCoords(e.clientX, e.clientY);
      const panel =
        state.comicData[state.currentPageIndex].panels[
        state.selectedPanelIndex
        ];

      // Calcula nova posição mantendo valores inteiros
      panel[0] = Math.floor(
        state.originalPanelState[0] + (coords.x - state.dragStartX)
      );
      panel[1] = Math.floor(
        state.originalPanelState[1] + (coords.y - state.dragStartY)
      );

      // Mantém dentro dos limites do canvas
      panel[0] = Math.max(
        0,
        Math.min(panel[0], elements.canvas.width - panel[2])
      );
      panel[1] = Math.max(
        0,
        Math.min(panel[1], elements.canvas.height - panel[3])
      );

      displayCurrentPage();
    }
  }

  document.addEventListener("mousemove", (e) => {
    if (state.isDrawing || state.resizingHandle) {
      handleCanvasMouseMove(e);
    }
  });

  document.addEventListener("mouseup", () => {
    if (state.isDrawing) {
      state.isDrawing = false;

      const panel =
        state.comicData[state.currentPageIndex].panels[
        state.selectedPanelIndex
        ];

      // Remove painel se for muito pequeno
      if (panel[2] < 10 || panel[3] < 10) {
        state.comicData[state.currentPageIndex].panels.splice(
          state.selectedPanelIndex,
          1
        );
        state.selectedPanelIndex = -1;
      }

      displayCurrentPage();
    }

    if (state.resizingHandle) {
      state.resizingHandle = null;
      state.originalPanelState = null;
      saveState();
    }
  });

  function handleCanvasMouseUp() {
    if (state.resizingHandle) {
      const panel =
        state.comicData[state.currentPageIndex].panels[
        state.selectedPanelIndex
        ];
      const MIN_SIZE = 20;

      // Converte todos valores para inteiros
      panel[0] = Math.floor(panel[0]);
      panel[1] = Math.floor(panel[1]);
      panel[2] = Math.floor(panel[2]);
      panel[3] = Math.floor(panel[3]);

      // Validação do tamanho mínimo mantendo a direção do redimensionamento
      if (panel[2] < MIN_SIZE) {
        const diff = MIN_SIZE - panel[2];
        if (state.resizingHandle.includes("left")) {
          panel[0] -= diff;
        }
        panel[2] = MIN_SIZE;
      }

      if (panel[3] < MIN_SIZE) {
        const diff = MIN_SIZE - panel[3];
        if (state.resizingHandle.includes("top")) {
          panel[1] -= diff;
        }
        panel[3] = MIN_SIZE;
      }

      // Garante que o painel não saia dos limites do canvas
      panel[0] = Math.max(
        0,
        Math.min(panel[0], elements.canvas.width - MIN_SIZE)
      );
      panel[1] = Math.max(
        0,
        Math.min(panel[1], elements.canvas.height - MIN_SIZE)
      );
      panel[2] = Math.min(panel[2], elements.canvas.width - panel[0]);
      panel[3] = Math.min(panel[3], elements.canvas.height - panel[1]);

      // Mantém o painel redimensionado se for válido
      if (panel[2] > 0 && panel[3] > 0) {
        state.resizingHandle = null;
        state.originalPanelState = null;
        saveState();
      } else {
        // Reverte se for inválido (não deveria acontecer com as validações acima)
        state.comicData[state.currentPageIndex].panels[
          state.selectedPanelIndex
        ] = [...state.originalPanelState];
      }

      displayCurrentPage();
    }
    if (state.resizingHandle) {
      state.resizingHandle = null;
      state.originalPanelState = null;
      saveState(); // Salva o estado após redimensionamento
    }
    if (state.draggingPanel) {
      state.draggingPanel = false;
      saveState(); // Salva o estado após movimentação
    }
  }

  document.addEventListener("mouseup", handleCanvasMouseUp);

  function handleCanvasMouseOut(e) {
    if (state.isDrawing) {
      // Não finaliza o desenho aqui, apenas verifica os limites
      const rect = elements.canvas.getBoundingClientRect();
      const mouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const mouseY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      const coords = getImageCoords(mouseX + rect.left, mouseY + rect.top);
      updateDrawingPanel(coords.x, coords.y);
    }
  }

  function getResizeHandleUnderMouse(x, y) {
    const panel =
      state.comicData[state.currentPageIndex].panels[state.selectedPanelIndex];
    const HANDLE_SIZE = 10;

    const left = panel[0];
    const right = panel[0] + panel[2];
    const top = panel[1];
    const bottom = panel[1] + panel[3];

    // Canto superior esquerdo
    if (Math.abs(x - left) <= HANDLE_SIZE && Math.abs(y - top) <= HANDLE_SIZE) {
      return "nw-resize";
    }

    // Canto superior direito
    if (
      Math.abs(x - right) <= HANDLE_SIZE &&
      Math.abs(y - top) <= HANDLE_SIZE
    ) {
      return "ne-resize";
    }

    // Canto inferior esquerdo
    if (
      Math.abs(x - left) <= HANDLE_SIZE &&
      Math.abs(y - bottom) <= HANDLE_SIZE
    ) {
      return "sw-resize";
    }

    // Canto inferior direito
    if (
      Math.abs(x - right) <= HANDLE_SIZE &&
      Math.abs(y - bottom) <= HANDLE_SIZE
    ) {
      return "se-resize";
    }

    // Bordas
    // Topo
    if (
      x >= left + HANDLE_SIZE &&
      x <= right - HANDLE_SIZE &&
      Math.abs(y - top) <= HANDLE_SIZE
    ) {
      return "n-resize";
    }

    // Fundo
    if (
      x >= left + HANDLE_SIZE &&
      x <= right - HANDLE_SIZE &&
      Math.abs(y - bottom) <= HANDLE_SIZE
    ) {
      return "s-resize";
    }

    // Esquerda
    if (
      Math.abs(x - left) <= HANDLE_SIZE &&
      y >= top + HANDLE_SIZE &&
      y <= bottom - HANDLE_SIZE
    ) {
      return "w-resize";
    }

    // Direita
    if (
      Math.abs(x - right) <= HANDLE_SIZE &&
      y >= top + HANDLE_SIZE &&
      y <= bottom - HANDLE_SIZE
    ) {
      return "e-resize";
    }

    return null;
  }

  function updateDrawingPanel(mouseX, mouseY) {
    const panel =
      state.comicData[state.currentPageIndex].panels[state.selectedPanelIndex];

    // Garante valores inteiros e dentro dos limites
    panel[0] = Math.floor(Math.min(state.startX, mouseX));
    panel[1] = Math.floor(Math.min(state.startY, mouseY));
    panel[2] = Math.floor(Math.abs(mouseX - state.startX));
    panel[3] = Math.floor(Math.abs(mouseY - state.startY));

    // Limites do canvas
    if (panel[0] + panel[2] > elements.canvas.width) {
      panel[2] = elements.canvas.width - panel[0];
    }
    if (panel[1] + panel[3] > elements.canvas.height) {
      panel[3] = elements.canvas.height - panel[1];
    }

    displayCurrentPage();
  }

  function updatePropertiesForm() {
    if (state.selectedPanelIndex === -1 || !state.comicData || state.comicData.length <= state.currentPageIndex) {
      elements.propertiesForm.innerHTML = '<p>Selecione um painel para editar</p>';
      return;
    }

    const panel = state.comicData[state.currentPageIndex].panels[state.selectedPanelIndex];
    const maxWidth = elements.canvas.width - panel[0];
    const maxHeight = elements.canvas.height - panel[1];

    elements.propertiesForm.innerHTML = `
                <div class="property-input">
                  <label for="panel-x">Posição X:</label>
                  <input type="number" id="panel-x" value="${panel[0]}" min="0" max="${elements.canvas.width}">
                </div>
                <div class="property-input">
                  <label for="panel-y">Posição Y:</label>
                  <input type="number" id="panel-y" value="${panel[1]}" min="0" max="${elements.canvas.height}">
                </div>
                <div class="property-input">
                  <label for="panel-width">Largura:</label>
                  <input type="number" id="panel-width" value="${panel[2]}" min="1" max="${maxWidth}">
                </div>
                <div class="property-input">
                  <label for="panel-height">Altura:</label>
                  <input type="number" id="panel-height" value="${panel[3]}" min="1" max="${maxHeight}">
                </div>
                <button id="update-panel-btn"><svg xmlns="http://www.w3.org/2000/svg" fill="none" width="24" height="24" viewBox="0 0 24 24" stroke-width="2"
                    stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg></button>
                <button id="delete-panel-btn"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M17 5V4C17 2.89543 16.1046 2 15 2H9C7.89543 2 7 2.89543 7 4V5H4C3.44772 5 3 5.44772 3 6C3 6.55228 3.44772 7 4 7H5V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V7H20C20.5523 7 21 6.55228 21 6C21 5.44772 20.5523 5 20 5H17ZM15 4H9V5H15V4ZM17 7H7V18C7 18.5523 7.44772 19 8 19H16C16.5523 19 17 18.5523 17 18V7Z"
                      fill="currentColor" />
                    <path d="M9 9H11V17H9V9Z" fill="currentColor" />
                    <path d="M13 9H15V17H13V9Z" fill="currentColor" />
                  </svg></button>
                <button id="zoom-panel-btn" data-label="Zoom Painel">${state.zoomMode ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M15.3431 15.2426C17.6863 12.8995 17.6863 9.1005 15.3431 6.75736C13 4.41421 9.20101 4.41421 6.85786 6.75736C4.51472 9.1005 4.51472 12.8995 6.85786 15.2426C9.20101 17.5858 13 17.5858 15.3431 15.2426ZM16.7574 5.34315C19.6425 8.22833 19.8633 12.769 17.4195 15.9075C17.4348 15.921 17.4498 15.9351 17.4645 15.9497L21.7071 20.1924C22.0976 20.5829 22.0976 21.2161 21.7071 21.6066C21.3166 21.9971 20.6834 21.9971 20.2929 21.6066L16.0503 17.364C16.0356 17.3493 16.0215 17.3343 16.008 17.319C12.8695 19.7628 8.32883 19.542 5.44365 16.6569C2.31946 13.5327 2.31946 8.46734 5.44365 5.34315C8.56785 2.21895 13.6332 2.21895 16.7574 5.34315ZM7.10052 10V12H15.1005V10L7.10052 10Z"
                      fill="currentColor" />
                  </svg>`: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M15.3431 15.2426C17.6863 12.8995 17.6863 9.1005 15.3431 6.75736C13 4.41421 9.20101 4.41421 6.85786 6.75736C4.51472 9.1005 4.51472 12.8995 6.85786 15.2426C9.20101 17.5858 13 17.5858 15.3431 15.2426ZM16.7574 5.34315C19.6425 8.22833 19.8633 12.769 17.4195 15.9075C17.4348 15.921 17.4498 15.9351 17.4645 15.9497L21.7071 20.1924C22.0976 20.5829 22.0976 21.2161 21.7071 21.6066C21.3166 21.9971 20.6834 21.9971 20.2929 21.6066L16.0503 17.364C16.0356 17.3493 16.0215 17.3343 16.008 17.319C12.8695 19.7628 8.32883 19.542 5.44365 16.6569C2.31946 13.5327 2.31946 8.46734 5.44365 5.34315C8.56785 2.21895 13.6332 2.21895 16.7574 5.34315ZM10.1005 7H12.1005V10H15.1005V12H12.1005V15H10.1005V12H7.10052V10H10.1005V7Z"
                      fill="currentColor" />
                  </svg>`}</button>
                ${state.zoomMode ? `
                <button id="toggle-borders-btn">${state.showPanelBorders ? `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16" id="Dot--Streamline-Bootstrap">
                              <desc>
                                Dot Streamline Icon: https://streamlinehq.com
                              </desc>
                              <path d="M8 9.5a1.5 1.5 0 1 0 0 -3 1.5 1.5 0 0 0 0 3" stroke-width="1"></path>
                            </svg>`: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" id="Square--Streamline-Tabler">
                              <desc>
                                Square Streamline Icon: https://streamlinehq.com
                              </desc>
                              <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2H5a2 2 0 0 1 -2 -2z" stroke-width="2"></path>
                            </svg>`}</button>
                <button id="toggle-blur-btn">${state.panelBlur ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" id="Blur-Off--Streamline-Tabler">
                    <desc>
                      Blur Off Streamline Icon: https://streamlinehq.com
                    </desc>
                    <path d="M12 3v5m0 4v8" stroke-width="2"></path>
                    <path d="M5.641 5.631A9 9 0 1 0 18.36 18.369m1.68 -2.318A9 9 0 0 0 7.966 3.953" stroke-width="2"></path>
                    <path d="M16 12h5" stroke-width="2"></path>
                    <path d="M13 9h7" stroke-width="2"></path>
                    <path d="M12 6h6" stroke-width="2"></path>
                    <path d="M12 18h6" stroke-width="2"></path>
                    <path d="M12 15h3m4 0h1" stroke-width="2"></path>
                    <path d="m3 3 18 18" stroke-width="2"></path>
                  </svg>`: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" id="Blur--Streamline-Tabler">
                    <desc>
                      Blur Streamline Icon: https://streamlinehq.com
                    </desc>
                    <path d="M12 21a9.01 9.01 0 0 0 2.32 -0.302 9 9 0 0 0 1.74 -16.733A9 9 0 1 0 12 21z" stroke-width="2"></path>
                    <path d="M12 3v17" stroke-width="2"></path>
                    <path d="M12 12h9" stroke-width="2"></path>
                    <path d="M12 9h8" stroke-width="2"></path>
                    <path d="M12 6h6" stroke-width="2"></path>
                    <path d="M12 18h6" stroke-width="2"></path>
                    <path d="M12 15h8" stroke-width="2"></path>
                  </svg>` }</button>
                ` : ''}
                </div>
        `;

    // Event listeners
    document.getElementById('update-panel-btn').addEventListener('click', updatePanel);
    document.getElementById('delete-panel-btn').addEventListener('click', deletePanel);
    document.getElementById('zoom-panel-btn').addEventListener('click', toggleZoomPanel);

    if (state.zoomMode) {
      document.getElementById('toggle-borders-btn').addEventListener('click', togglePanelBorders);
      document.getElementById('toggle-blur-btn').addEventListener('click', togglePanelBlur);
    }

    document.getElementById("panel-x").addEventListener("change", function () {
      const newX = parseInt(this.value);
      document.getElementById("panel-width").max = elements.canvas.width - newX;
    });

    document.getElementById("panel-y").addEventListener("change", function () {
      const newY = parseInt(this.value);
      document.getElementById("panel-height").max =
        elements.canvas.height - newY;
    });
  }

  function toggleZoomPanel() {
    state.zoomMode = !state.zoomMode;

    if (state.zoomMode) {
      state.zoomedPanelIndex = state.selectedPanelIndex;
      // Reset configurações do zoom
      state.showPanelBorders = state.showPanelBorders;
      state.panelBlur = state.effectMode;
    } else {
      state.zoomedPanelIndex = -1;
    }

    displayCurrentPage();
    updatePropertiesForm();
  }

  function togglePanelBorders() {
    state.showPanelBorders = !state.showPanelBorders;
    displayCurrentPage();
    updatePropertiesForm();
  }

  function togglePanelBlur() {
    state.panelBlur = !state.panelBlur;
    displayCurrentPage();
  }


  function updatePanel() {
    if (
      state.selectedPanelIndex === -1 ||
      !state.comicData ||
      state.comicData.length <= state.currentPageIndex
    )
      return;

    saveState();
    const x = parseInt(document.getElementById("panel-x").value);
    const y = parseInt(document.getElementById("panel-y").value);
    const width = parseInt(document.getElementById("panel-width").value);
    const height = parseInt(document.getElementById("panel-height").value);

    state.comicData[state.currentPageIndex].panels[state.selectedPanelIndex] = [
      x,
      y,
      width,
      height
    ];
    displayCurrentPage();
  }

  function deletePanel() {
    if (
      state.selectedPanelIndex === -1 ||
      !state.comicData ||
      state.comicData.length <= state.currentPageIndex
    )
      return;

    if (confirm("Tem certeza que deseja excluir este painel?")) {
      saveState();
      state.comicData[state.currentPageIndex].panels.splice(
        state.selectedPanelIndex,
        1
      );
      state.selectedPanelIndex = -1;
      displayCurrentPage();
    }
  }

  function addNewPanel() {
    if (!state.comicData || state.comicData.length <= state.currentPageIndex)
      return;

    saveState();
    const newPanel = [10, 10, 100, 100];
    state.comicData[state.currentPageIndex].panels.push(newPanel);
    state.selectedPanelIndex =
      state.comicData[state.currentPageIndex].panels.length - 1;
    displayCurrentPage();
  }

  function goToPreviousPage() {
    if (state.currentPageIndex > 0) {
      state.currentPageIndex--;
      resetSelection();
      displayCurrentPage();
      updateNavButtons();
    }
  }

  function goToNextPage() {
    if (state.currentPageIndex < state.comicData.length - 1) {
      state.currentPageIndex++;
      resetSelection();
      displayCurrentPage();
      updateNavButtons();
    }
  }

  function resetSelection() {
    state.selectedPanelIndex = -1;
    state.selectedPanelsForMerge = [];
    state.isDrawing = false;
  }

  function updateNavButtons() {
    elements.prevPageBtn.disabled = state.currentPageIndex === 0;
    elements.nextPageBtn.disabled =
      state.currentPageIndex ===
      (state.comicData ? state.comicData.length - 1 : 0);
    updatePageSelector();
  }

  function updatePageSelector() {
    if (!state.comicData) return;

    elements.pageSelect.innerHTML = "";
    state.comicData.forEach((page, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = `${index + 1}`;
      option.selected = index === state.currentPageIndex;
      elements.pageSelect.appendChild(option);
    });

    elements.pageInfo.textContent = `${state.currentPageIndex + 1} de ${state.comicData.length
      }`;
    elements.pageTotal.textContent = `de ${state.comicData.length}`;
  }

  // Event listener para o seletor
  elements.pageSelect.addEventListener("change", (e) => {
    state.currentPageIndex = parseInt(e.target.value);
    resetSelection();
    displayCurrentPage();
    updateUrl();
  });

  // Função para atualizar a URL
  function updateUrl() {
    if (state.comicData && state.comicData.length > 0) {
      const newUrl = `${window.location.pathname}?page=${state.currentPageIndex + 1
        }`;
      window.history.pushState({}, "", newUrl);
    }
  }

  // Função para ler parâmetro da URL
  function getPageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page");
    return pageParam ? parseInt(pageParam) - 1 : 0;
  }

  function saveState() {
    // Limpar estados futuros se estamos no meio do histórico
    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }

    const newState = {
      comicData: JSON.parse(JSON.stringify(state.comicData)),
      currentPageIndex: state.currentPageIndex,
      selectedPanelIndex: state.selectedPanelIndex,
      selectedPanelsForMerge: [...state.selectedPanelsForMerge]
    };

    state.history.push(newState);
    state.historyIndex++;

    // Limitar histórico a 50 estados
    if (state.history.length > 50) {
      state.history.shift();
      state.historyIndex--;
    }

    updateButtonStates();
  }

  function undoAction() {
    if (state.historyIndex <= 0) return;

    state.historyIndex--;
    applyState(state.history[state.historyIndex]);
  }

  function redoAction() {
    if (state.historyIndex >= state.history.length - 1) return;

    state.historyIndex++;
    applyState(state.history[state.historyIndex]);
  }

  function applyState(historyState) {
    state.comicData = JSON.parse(JSON.stringify(historyState.comicData));
    state.currentPageIndex = historyState.currentPageIndex;
    state.selectedPanelIndex = historyState.selectedPanelIndex;
    state.selectedPanelsForMerge = [...historyState.selectedPanelsForMerge];

    displayCurrentPage();
    updateButtonStates();
  }

  function updateButtonStates() {
    // Navegação
    elements.prevPageBtn.disabled = state.currentPageIndex === 0;
    elements.nextPageBtn.disabled =
      state.currentPageIndex ===
      (state.comicData ? state.comicData.length - 1 : 0);

    // Desfazer/Refazer
    elements.undoBtn.disabled = state.historyIndex <= 0;
    elements.redoBtn.disabled = state.historyIndex >= state.history.length - 1;

    // Modos
    elements.drawModeBtn.disabled =
      !state.comicData || state.comicData.length === 0;
    elements.mergePanelsBtn.disabled =
      !state.comicData ||
      state.comicData.length === 0 ||
      (state.comicData[state.currentPageIndex] &&
        state.comicData[state.currentPageIndex].panels.length < 2);

    // Estilos dos botões de modo
    elements.drawModeBtn.classList.toggle("active", state.isDrawMode);
    elements.mergePanelsBtn.classList.toggle("active", state.isMergeMode);
  }

  function toggleBlurMode() {
    state.effectMode = !state.effectMode;
    elements.blurModeBtn.classList.toggle("active");
    displayCurrentPage(); // Redesenha o canvas com o efeito
  }

  function handleKeyboardShortcuts(e) {
    // Desfazer/Refazer
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      undoAction();
    } else if (e.ctrlKey && e.key === "y") {
      e.preventDefault();
      redoAction();
    }
  }

  function setupKeyboardShortcuts() {
    // Mapeamento de atalhos
    const shortcuts = [
      { key: 'd', ctrl: false, shift: false, target: elements.drawModeBtn },
      { key: 'q', ctrl: false, shift: false, target: elements.mergePanelsBtn },
      { key: 'n', ctrl: false, shift: false, target: elements.addPanelBtn },
      { key: 's', ctrl: true, shift: false, target: elements.saveBtn },
      { key: 'z', ctrl: true, shift: false, target: elements.undoBtn },
      { key: 'y', ctrl: true, shift: false, target: elements.redoBtn },
      { key: 'arrowleft', ctrl: false, shift: false, target: elements.prevPageBtn },
      { key: 'arrowright', ctrl: false, shift: false, target: elements.nextPageBtn },
      { key: 'e', ctrl: false, shift: false, target: elements.blurModeBtn },
      { key: 'f', ctrl: false, shift: false, target: elements.resetPanelsBtn },
      {
        key: 'a',
        ctrl: false,
        shift: false,
        get target() {
          return document.getElementById('zoom-panel-btn');
        },
      },
    ];

    function resolveTarget(shortcut) {
      return typeof shortcut.target === 'function' ? shortcut.target() : shortcut.target;
    }

    function formatTitle({ key, ctrl, shift }, labelElement) {
      let prefix = '';
      if (ctrl) prefix += 'Ctrl + ';
      if (shift) prefix += 'Shift + ';
      prefix += key.length === 1 ? key.toUpperCase() : key;

      const label = labelElement.dataset.label || labelElement.innerText.trim();
      return `${label} : ${prefix}`;
    }

    // Observa mudanças no texto do botão e atualiza o title
    function syncTitleWithText(config) {
      const target = resolveTarget(config);
      if (!target) return;

      const updateTitle = () => {
        target.title = formatTitle(config, target);
      };

      const observer = new MutationObserver(updateTitle);
      observer.observe(target, { childList: true, subtree: true, characterData: true });

      updateTitle();
    }

    shortcuts.forEach(syncTitleWithText);

    // Normaliza a tecla para comparar com atalhos
    function normalizeKey(key) {
      return key.toLowerCase();
    }

    // Listener de teclas
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      const keyPressed = normalizeKey(e.key);
      const ctrlKey = e.ctrlKey || e.metaKey;
      const shiftKey = e.shiftKey;

      for (const shortcut of shortcuts) {
        const shortcutKey = normalizeKey(shortcut.key);

        const matches =
          shortcutKey === keyPressed &&
          !!shortcut.ctrl === !!ctrlKey &&
          !!shortcut.shift === !!shiftKey;

        if (matches) {
          const target = resolveTarget(shortcut);
          if (target) {
            e.preventDefault();
            target.click();
          } else {
            console.warn(`Atalho "${shortcut.key}" detectado, mas botão não encontrado.`);
          }
          break;
        }
      }
    });
  }


  function saveComicData() {
    if (!state.comicData) {
      alert("Nenhum dado para salvar");
      return;
    }

    // Obtém o nome do arquivo original do input
    const originalFileName =
      elements.jsonInput.files[0]?.name || "comic_panels";

    // Remove a extensão .json se existir
    const fileNameWithoutExt = originalFileName.replace(/\.json$/i, "");

    // Cria o nome do arquivo de saída
    const outputFileName = `${fileNameWithoutExt}_edit.json`;

    const jsonStr = JSON.stringify(state.comicData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.addEventListener("popstate", () => {
    const newPage = getPageFromUrl();
    if (newPage !== state.currentPageIndex) {
      state.currentPageIndex = newPage;
      resetSelection();
      displayCurrentPage();
    }
  });

  elements.resetPanelsBtn = document.getElementById("reset-panels-btn");
  elements.resetPanelsBtn.addEventListener("click", () => {
    if (
      confirm(
        "Deseja remover todos os painéis desta página e capturar a imagem toda?"
      )
    ) {
      saveState();
      const pageData = state.comicData[state.currentPageIndex];
      pageData.panels = [[0, 0, pageData.size[0], pageData.size[1]]];
      state.selectedPanelIndex = 0;
      state.selectedPanelsForMerge = [];
      displayCurrentPage();
    }
  });

  setupKeyboardShortcuts();
});
