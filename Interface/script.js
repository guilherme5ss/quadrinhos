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
    pageInfo: document.getElementById("page-info"),
    blurModeBtn: document.getElementById("blur-mode-btn"),
    mouseCoordsDisplay: document.getElementById("mouse-coords")
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
    effectMode: false, // true para ativar o efeito, false para desativar
    effectType: "pixelate", // 'blur' ou 'pixelate'
    effectSize: 64, // Tamanho/intensidade do efeito
    mousePosition: { x: 0, y: 0 }, // Novo estado para armazenar posição do mouse
    resizingHandle: null,
    originalPanelState: null
  };

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
      try {
        const newComicData = JSON.parse(e.target.result);
        saveState();
        state.comicData = newComicData;
        updatePageInfo();
        loadImages();
      } catch (error) {
        alert("Erro ao ler o arquivo JSON: " + error.message);
      }
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
    const handles = getHandleRects(panel);

    for (const [type, rect] of Object.entries(handles)) {
      if (
        x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height
      ) {
        return type;
      }
    }

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
      // ... código de desenho existente ...

      // Desenhar alças apenas para o painel selecionado
      if (i === state.selectedPanelIndex) {
        drawHandles(panel);
      }
    });

    updatePanelsList();
    updatePropertiesForm();
    updateButtonStates();

    // Posiciona o display de coordenadas
    elements.mouseCoordsDisplay.style.display = "block";
    updateMouseCoordsDisplay();
  }

  function updatePanelsList() {
    if (!state.comicData || state.comicData.length <= state.currentPageIndex)
      return;

    elements.panelsList.innerHTML = "";
    const panels = state.comicData[state.currentPageIndex].panels;

    panels.forEach((panel, i) => {
      const li = document.createElement("li");
      li.textContent = `Painel ${i + 1}: ${panel[0]}x${panel[1]} (${panel[2]}×${panel[3]
        })`;
      li.dataset.index = i;

      // Sincroniza com as seleções atuais
      if (i === state.selectedPanelIndex) {
        li.classList.add("active");
      } else if (state.selectedPanelsForMerge.includes(i)) {
        li.classList.add("merge-selected");
      }

      li.addEventListener("click", function (e) {
        if (e.target.tagName === "BUTTON") return;

        const index = parseInt(this.dataset.index);

        // Simula o mesmo comportamento do clique na imagem
        const mockEvent = {
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey
        };

        // Atualiza o estado como se tivesse clicado na imagem
        if (state.isMergeMode) {
          if (mockEvent.ctrlKey || mockEvent.metaKey) {
            const idx = state.selectedPanelsForMerge.indexOf(index);
            if (idx === -1) {
              state.selectedPanelsForMerge.push(index);
            } else {
              state.selectedPanelsForMerge.splice(idx, 1);
            }
          } else if (
            mockEvent.shiftKey &&
            state.selectedPanelsForMerge.length > 0
          ) {
            const lastSelected = Math.max(...state.selectedPanelsForMerge);
            const start = Math.min(lastSelected, index);
            const end = Math.max(lastSelected, index);
            state.selectedPanelsForMerge = [];
            for (let i = start; i <= end; i++) {
              state.selectedPanelsForMerge.push(i);
            }
          } else {
            state.selectedPanelsForMerge = [index];
          }
          state.selectedPanelIndex = -1;
        } else {
          state.selectedPanelIndex = index;
          state.selectedPanelsForMerge = [];
        }

        displayCurrentPage();
      });

      // Botões de mover (mantidos)
      const moveUpBtn = document.createElement("button");
      moveUpBtn.textContent = "↑";
      moveUpBtn.className = "move-btn";
      moveUpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        movePanelUp(i);
      });

      const moveDownBtn = document.createElement("button");
      moveDownBtn.textContent = "↓";
      moveDownBtn.className = "move-btn";
      moveDownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        movePanelDown(i);
      });

      li.prepend(moveDownBtn);
      li.prepend(moveUpBtn);
      elements.panelsList.appendChild(li);
    });
  }

  function handlePanelSelection(index, event) {
    if (state.isMergeMode) {
      if (event.ctrlKey || event.metaKey) {
        // Ctrl+Clique: alterna seleção
        const idx = state.selectedPanelsForMerge.indexOf(index);
        if (idx === -1) {
          state.selectedPanelsForMerge.push(index);
        } else {
          state.selectedPanelsForMerge.splice(idx, 1);
        }
      } else if (event.shiftKey && state.selectedPanelsForMerge.length > 0) {
        // Shift+Clique: seleção de intervalo
        const lastSelected =
          state.selectedPanelsForMerge[state.selectedPanelsForMerge.length - 1];
        const start = Math.min(lastSelected, index);
        const end = Math.max(lastSelected, index);
        state.selectedPanelsForMerge = [];
        for (let i = start; i <= end; i++) {
          state.selectedPanelsForMerge.push(i);
        }
      } else {
        // Clique normal: seleção única
        state.selectedPanelsForMerge = [index];
      }

      // Garante que pelo menos um painel está selecionado no modo merge
      if (state.selectedPanelsForMerge.length === 0) {
        state.selectedPanelsForMerge = [index];
      }

      state.selectedPanelIndex = -1;
    } else {
      // Modo normal: seleção única
      state.selectedPanelIndex = index;
      state.selectedPanelsForMerge = [];
    }

    displayCurrentPage();
  }

  function movePanelUp(index) {
    if (index <= 0) return;

    saveState();
    const panels = state.comicData[state.currentPageIndex].panels;
    [panels[index], panels[index - 1]] = [panels[index - 1], panels[index]];

    // Ajustar seleções
    if (state.selectedPanelIndex === index) {
      state.selectedPanelIndex = index - 1;
    } else if (state.selectedPanelIndex === index - 1) {
      state.selectedPanelIndex = index;
    }

    state.selectedPanelsForMerge = state.selectedPanelsForMerge.map((i) => {
      if (i === index) return index - 1;
      if (i === index - 1) return index;
      return i;
    });

    displayCurrentPage();
  }

  function movePanelDown(index) {
    const panels = state.comicData[state.currentPageIndex].panels;
    if (index >= panels.length - 1) return;

    saveState();
    [panels[index], panels[index + 1]] = [panels[index + 1], panels[index]];

    // Ajustar seleções
    if (state.selectedPanelIndex === index) {
      state.selectedPanelIndex = index + 1;
    } else if (state.selectedPanelIndex === index + 1) {
      state.selectedPanelIndex = index;
    }

    state.selectedPanelsForMerge = state.selectedPanelsForMerge.map((i) => {
      if (i === index) return index + 1;
      if (i === index + 1) return index;
      return i;
    });

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
      const selectedPanel =
        state.comicData[state.currentPageIndex].panels[
        state.selectedPanelIndex
        ];
      state.resizingHandle = getHandleAtPosition(
        selectedPanel,
        coords.x,
        coords.y
      );

      if (state.resizingHandle) {
        state.originalPanelState = [...selectedPanel];
        e.preventDefault();
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
        // Lógica de seleção múltipla (mantida igual)
        if (e.ctrlKey || e.metaKey) {
          const index = state.selectedPanelsForMerge.indexOf(clickedPanelIndex);
          if (index === -1) {
            state.selectedPanelsForMerge.push(clickedPanelIndex);
          } else {
            state.selectedPanelsForMerge.splice(index, 1);
          }
        } else if (e.shiftKey && state.selectedPanelsForMerge.length > 0) {
          const lastSelected = Math.max(...state.selectedPanelsForMerge);
          const start = Math.min(lastSelected, clickedPanelIndex);
          const end = Math.max(lastSelected, clickedPanelIndex);
          state.selectedPanelsForMerge = [];
          for (let i = start; i <= end; i++) {
            state.selectedPanelsForMerge.push(i);
          }
        } else {
          state.selectedPanelsForMerge = [clickedPanelIndex];
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

  function handleCanvasMouseMove(e) {
    if (state.isDrawing) {
      const rect = elements.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Verifica se o mouse está dentro dos limites do canvas
      const isInside =
        mouseX >= 0 &&
        mouseX <= rect.width &&
        mouseY >= 0 &&
        mouseY <= rect.height;

      if (isInside) {
        const coords = getImageCoords(e.clientX, e.clientY);
        updateDrawingPanel(coords.x, coords.y);
      } else {
        // Atualiza com as coordenadas no limite do canvas
        const boundedX = Math.max(0, Math.min(mouseX, rect.width));
        const boundedY = Math.max(0, Math.min(mouseY, rect.height));
        const coords = getImageCoords(
          boundedX + rect.left,
          boundedY + rect.top
        );
        updateDrawingPanel(coords.x, coords.y);
      }
    } else if (state.resizingHandle) {
      const coords = getImageCoords(e.clientX, e.clientY);
      const panel =
        state.comicData[state.currentPageIndex].panels[
        state.selectedPanelIndex
        ];

      // Mantém valores mínimos de tamanho
      const MIN_SIZE = 20;

      switch (state.resizingHandle) {
        case HANDLE_TYPES.TOP_LEFT:
          panel[0] = Math.min(
            coords.x,
            state.originalPanelState[0] + state.originalPanelState[2] - MIN_SIZE
          );
          panel[1] = Math.min(
            coords.y,
            state.originalPanelState[1] + state.originalPanelState[3] - MIN_SIZE
          );
          panel[2] =
            state.originalPanelState[0] +
            state.originalPanelState[2] -
            panel[0];
          panel[3] =
            state.originalPanelState[1] +
            state.originalPanelState[3] -
            panel[1];
          break;

        case HANDLE_TYPES.TOP_RIGHT:
          panel[1] = Math.min(
            coords.y,
            state.originalPanelState[1] + state.originalPanelState[3] - MIN_SIZE
          );
          panel[2] = Math.max(MIN_SIZE, coords.x - state.originalPanelState[0]);
          panel[3] =
            state.originalPanelState[1] +
            state.originalPanelState[3] -
            panel[1];
          break;

        case HANDLE_TYPES.BOTTOM_LEFT:
          panel[0] = Math.min(
            coords.x,
            state.originalPanelState[0] + state.originalPanelState[2] - MIN_SIZE
          );
          panel[2] =
            state.originalPanelState[0] +
            state.originalPanelState[2] -
            panel[0];
          panel[3] = Math.max(MIN_SIZE, coords.y - state.originalPanelState[1]);
          break;

        case HANDLE_TYPES.BOTTOM_RIGHT:
          panel[2] = Math.max(MIN_SIZE, coords.x - state.originalPanelState[0]);
          panel[3] = Math.max(MIN_SIZE, coords.y - state.originalPanelState[1]);
          break;

        case HANDLE_TYPES.TOP:
          panel[1] = Math.min(
            coords.y,
            state.originalPanelState[1] + state.originalPanelState[3] - MIN_SIZE
          );
          panel[3] =
            state.originalPanelState[1] +
            state.originalPanelState[3] -
            panel[1];
          break;

        case HANDLE_TYPES.RIGHT:
          panel[2] = Math.max(MIN_SIZE, coords.x - state.originalPanelState[0]);
          break;

        case HANDLE_TYPES.BOTTOM:
          panel[3] = Math.max(MIN_SIZE, coords.y - state.originalPanelState[1]);
          break;

        case HANDLE_TYPES.LEFT:
          panel[0] = Math.min(
            coords.x,
            state.originalPanelState[0] + state.originalPanelState[2] - MIN_SIZE
          );
          panel[2] =
            state.originalPanelState[0] +
            state.originalPanelState[2] -
            panel[0];
          break;
      }

      displayCurrentPage();
    }
  }

  function handleCanvasMouseUp() {
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
      saveState(); // Salva o estado após redimensionamento
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
    if (
      state.selectedPanelIndex === -1 ||
      !state.comicData ||
      state.comicData.length <= state.currentPageIndex
    ) {
      elements.propertiesForm.innerHTML =
        "<p>Selecione um painel para editar</p>";
      return;
    }

    const panel =
      state.comicData[state.currentPageIndex].panels[state.selectedPanelIndex];
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
            <button id="update-panel-btn">Atualizar Painel</button>
            <button id="delete-panel-btn">Excluir Painel</button>
        `;

    document
      .getElementById("update-panel-btn")
      .addEventListener("click", updatePanel);
    document
      .getElementById("delete-panel-btn")
      .addEventListener("click", deletePanel);

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
    updatePageInfo();
  }

  function updatePageInfo() {
    if (!state.comicData) {
      elements.pageInfo.textContent = "Nenhum arquivo carregado";
      return;
    }
    elements.pageInfo.textContent = `Página ${state.currentPageIndex + 1} de ${state.comicData.length
      }`;
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

  function applyBlurEffect() {
    const panels = document.querySelectorAll("#panels-list li");
    panels.forEach((panel) => {
      panel.classList.toggle("blur-effect", state.isBlurMode);
    });
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

  function saveComicData() {
    if (!state.comicData) {
      alert("Nenhum dado para salvar");
      return;
    }

    const jsonStr = JSON.stringify(state.comicData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "comic_panels_modified.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
