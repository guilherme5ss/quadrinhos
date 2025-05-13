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
      blurModeBtn: document.getElementById("blur-mode-btn")
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
      isBlurMode: false
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
  
      // Se o modo blur estiver ativo, aplicar blur apenas nos painéis
      if (state.isBlurMode) {
        // Criar um canvas temporário para o efeito de blur
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = elements.canvas.width;
        tempCanvas.height = elements.canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
  
        // Desenhar a imagem com blur no canvas temporário
        tempCtx.filter = "blur(8px)";
        tempCtx.drawImage(
          img,
          0,
          0,
          elements.canvas.width,
          elements.canvas.height
        );
        tempCtx.filter = "none";
  
        // Para cada painel, recortar a área borrada do canvas temporário
        pageData.panels.forEach((panel) => {
          ctx.save();
          // Recortar a área do painel
          ctx.beginPath();
          ctx.rect(panel[0], panel[1], panel[2], panel[3]);
          ctx.clip();
          // Desenhar a versão borrada apenas nessa área
          ctx.drawImage(tempCanvas, 0, 0);
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
  
      updatePanelsList();
      updatePropertiesForm();
      updateButtonStates();
    }
  
    function updatePanelsList() {
      if (!state.comicData || state.comicData.length <= state.currentPageIndex)
        return;
  
      elements.panelsList.innerHTML = "";
      const panels = state.comicData[state.currentPageIndex].panels;
  
      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        const li = document.createElement("li");
        li.textContent = `Painel ${i + 1}: ${panel[0]}x${panel[1]} (${panel[2]}×${
          panel[3]
        })`;
        li.dataset.index = i;
  
        if (i === state.selectedPanelIndex) {
          li.classList.add("active");
        } else if (state.selectedPanelsForMerge.includes(i)) {
          li.classList.add("merge-selected");
        }
  
        // Botões de reordenamento
        const moveUpBtn = document.createElement("button");
        moveUpBtn.textContent = "↑";
        moveUpBtn.className = "move-btn";
        moveUpBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          movePanelUp(i);
        });
  
        const moveDownBtn = document.createElement("button");
        moveDownBtn.textContent = "↓";
        moveDownBtn.className = "move-btn";
        moveDownBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          movePanelDown(i);
        });
  
        li.addEventListener("click", function (e) {
          if (e.target.tagName === "BUTTON") return;
  
          const index = parseInt(this.dataset.index);
          handlePanelSelection(index, e);
        });
  
        li.prepend(moveDownBtn);
        li.prepend(moveUpBtn);
        elements.panelsList.appendChild(li);
      }
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
        state.isMergeMode = false;
        elements.mergePanelsBtn.classList.remove("active");
        state.selectedPanelsForMerge = [];
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
  
    function handleCanvasMouseDown(e) {
      if (!state.comicData || state.comicData.length <= state.currentPageIndex)
        return;
  
      const rect = elements.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
  
      if (state.isDrawMode) {
        // Modo desenho - iniciar novo painel
        state.startX = mouseX;
        state.startY = mouseY;
        state.isDrawing = true;
  
        saveState();
        state.comicData[state.currentPageIndex].panels.push([
          Math.max(0, Math.min(state.startX, elements.canvas.width)),
          Math.max(0, Math.min(state.startY, elements.canvas.height)),
          0,
          0
        ]);
        state.selectedPanelIndex =
          state.comicData[state.currentPageIndex].panels.length - 1;
        displayCurrentPage();
      } else {
        // Verificar clique em painel existente
        const panels = state.comicData[state.currentPageIndex].panels;
        let clickedPanel = -1;
  
        // Verificar de trás para frente (painéis no topo primeiro)
        for (let i = panels.length - 1; i >= 0; i--) {
          const panel = panels[i];
          if (
            mouseX >= panel[0] &&
            mouseX <= panel[0] + panel[2] &&
            mouseY >= panel[1] &&
            mouseY <= panel[1] + panel[3]
          ) {
            clickedPanel = i;
            break;
          }
        }
  
        if (clickedPanel !== -1) {
          handlePanelSelection(clickedPanel, e);
        } else {
          // Clicou fora de qualquer painel
          if (!state.isMergeMode) {
            state.selectedPanelIndex = -1;
          }
          state.selectedPanelsForMerge = [];
          displayCurrentPage();
        }
      }
    }
  
    function handleCanvasMouseMove(e) {
      if (
        !state.isDrawing ||
        !state.comicData ||
        state.comicData.length <= state.currentPageIndex
      )
        return;
  
      const rect = elements.canvas.getBoundingClientRect();
      const mouseX = Math.max(
        0,
        Math.min(e.clientX - rect.left, elements.canvas.width)
      );
      const mouseY = Math.max(
        0,
        Math.min(e.clientY - rect.top, elements.canvas.height)
      );
  
      const panel =
        state.comicData[state.currentPageIndex].panels[state.selectedPanelIndex];
  
      panel[0] = Math.min(state.startX, mouseX);
      panel[1] = Math.min(state.startY, mouseY);
      panel[2] = Math.abs(mouseX - state.startX);
      panel[3] = Math.abs(mouseY - state.startY);
  
      // Garantir que não ultrapasse os limites do canvas
      if (panel[0] + panel[2] > elements.canvas.width) {
        panel[2] = elements.canvas.width - panel[0];
      }
      if (panel[1] + panel[3] > elements.canvas.height) {
        panel[3] = elements.canvas.height - panel[1];
      }
  
      displayCurrentPage();
    }
  
    function handleCanvasMouseUp() {
      if (state.isDrawing) {
        state.isDrawing = false;
  
        const panel =
          state.comicData[state.currentPageIndex].panels[
            state.selectedPanelIndex
          ];
  
        // Remover painel se for muito pequeno
        if (panel[2] < 10 || panel[3] < 10) {
          state.comicData[state.currentPageIndex].panels.splice(
            state.selectedPanelIndex,
            1
          );
          state.selectedPanelIndex = -1;
        }
  
        displayCurrentPage();
      }
    }
  
    function handleCanvasMouseOut() {
      if (state.isDrawing) {
        state.isDrawing = false;
        displayCurrentPage();
      }
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
      elements.pageInfo.textContent = `Página ${state.currentPageIndex + 1} de ${
        state.comicData.length
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
      state.isBlurMode = !state.isBlurMode;
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
  