document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const jsonInput = document.getElementById('json-input');
    const imageInput = document.getElementById('image-input');
    const saveBtn = document.getElementById('save-btn');
    const rtlCheckbox = document.getElementById('rtl-checkbox');
    const canvas = document.getElementById('comic-canvas');
    const ctx = canvas.getContext('2d');
    const panelsList = document.getElementById('panels-list');
    const propertiesForm = document.getElementById('properties-form');
    const addPanelBtn = document.getElementById('add-panel-btn');
    
    // Estado da aplicação
    let comicData = null;
    let currentImage = null;
    let currentImageIndex = 0;
    let selectedPanelIndex = -1;
    let isDrawing = false;
    let startX, startY;
    
    // Carregar JSON
    jsonInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                comicData = JSON.parse(e.target.result);
                loadImage();
            } catch (error) {
                alert('Erro ao ler o arquivo JSON: ' + error.message);
            }
        };
        reader.readAsText(file);
    });
    
    // Carregar imagens
    imageInput.addEventListener('change', function(e) {
        if (!comicData) {
            alert('Por favor, carregue o JSON primeiro');
            return;
        }
        
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        // Verificar se o número de imagens corresponde ao JSON
        if (files.length !== comicData.length) {
            alert(`O JSON contém ${comicData.length} entradas, mas você selecionou ${files.length} imagens.`);
            return;
        }
        
        // Ordenar as imagens pelo nome para corresponder ao JSON
        files.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Carregar a primeira imagem
        loadImageFile(files[0], 0);
    });
    
    function loadImage() {
        if (!comicData || comicData.length === 0) return;
        
        // Se já temos a imagem (quando apenas o JSON é carregado novamente)
        if (currentImage) {
            drawImageAndPanels();
            updatePanelsList();
            return;
        }
        
        // Pedir para carregar as imagens
        alert(`Por favor, carregue as imagens correspondentes. O JSON referencia ${comicData.length} imagem(ns).`);
    }
    
    function loadImageFile(file, index) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                currentImage = img;
                currentImageIndex = index;
                drawImageAndPanels();
                updatePanelsList();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function drawImageAndPanels() {
        if (!currentImage || !comicData || comicData.length <= currentImageIndex) return;
        
        const pageData = comicData[currentImageIndex];
        
        // Configurar canvas
        canvas.width = pageData.size[0];
        canvas.height = pageData.size[1];
        
        // Desenhar imagem
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
        
        // Desenhar painéis
        const panels = pageData.panels;
        for (let i = 0; i < panels.length; i++) {
            const panel = panels[i];
            ctx.strokeStyle = i === selectedPanelIndex ? '#FF0000' : '#00FF00';
            ctx.lineWidth = 2;
            ctx.strokeRect(panel[0], panel[1], panel[2], panel[3]);
            
            // Adicionar número do painel
            ctx.fillStyle = i === selectedPanelIndex ? '#FF0000' : '#00FF00';
            ctx.font = 'bold 16px Arial';
            ctx.fillText((i + 1).toString(), panel[0] + 5, panel[1] + 20);
        }
    }
    
    function updatePanelsList() {
        if (!comicData || comicData.length <= currentImageIndex) return;
        
        panelsList.innerHTML = '';
        const panels = comicData[currentImageIndex].panels;
        
        for (let i = 0; i < panels.length; i++) {
            const panel = panels[i];
            const li = document.createElement('li');
            li.textContent = `Painel ${i + 1}: [${panel[0]}, ${panel[1]}, ${panel[2]}, ${panel[3]}]`;
            li.dataset.index = i;
            
            if (i === selectedPanelIndex) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', function() {
                selectPanel(parseInt(this.dataset.index));
            });
            
            panelsList.appendChild(li);
        }
    }
    
    function selectPanel(index) {
        selectedPanelIndex = index;
        updatePanelsList();
        drawImageAndPanels();
        updatePropertiesForm();
    }
    
    function updatePropertiesForm() {
        if (selectedPanelIndex === -1 || !comicData || comicData.length <= currentImageIndex) {
            propertiesForm.innerHTML = '<p>Selecione um painel para editar</p>';
            return;
        }
        
        const panel = comicData[currentImageIndex].panels[selectedPanelIndex];
        
        propertiesForm.innerHTML = `
            <div class="property-input">
                <label for="panel-x">X:</label>
                <input type="number" id="panel-x" value="${panel[0]}" min="0" max="${canvas.width}">
            </div>
            <div class="property-input">
                <label for="panel-y">Y:</label>
                <input type="number" id="panel-y" value="${panel[1]}" min="0" max="${canvas.height}">
            </div>
            <div class="property-input">
                <label for="panel-width">Largura:</label>
                <input type="number" id="panel-width" value="${panel[2]}" min="1" max="${canvas.width - panel[0]}">
            </div>
            <div class="property-input">
                <label for="panel-height">Altura:</label>
                <input type="number" id="panel-height" value="${panel[3]}" min="1" max="${canvas.height - panel[1]}">
            </div>
            <button id="update-panel-btn">Atualizar Painel</button>
            <button id="delete-panel-btn">Excluir Painel</button>
        `;
        
        document.getElementById('update-panel-btn').addEventListener('click', updatePanel);
        document.getElementById('delete-panel-btn').addEventListener('click', deletePanel);
        
        // Atualizar os máximos quando os valores mudam
        document.getElementById('panel-x').addEventListener('change', function() {
            document.getElementById('panel-width').max = canvas.width - this.value;
        });
        
        document.getElementById('panel-y').addEventListener('change', function() {
            document.getElementById('panel-height').max = canvas.height - this.value;
        });
    }
    
    function updatePanel() {
        if (selectedPanelIndex === -1 || !comicData || comicData.length <= currentImageIndex) return;
        
        const x = parseInt(document.getElementById('panel-x').value);
        const y = parseInt(document.getElementById('panel-y').value);
        const width = parseInt(document.getElementById('panel-width').value);
        const height = parseInt(document.getElementById('panel-height').value);
        
        comicData[currentImageIndex].panels[selectedPanelIndex] = [x, y, width, height];
        drawImageAndPanels();
        updatePanelsList();
    }
    
    function deletePanel() {
        if (selectedPanelIndex === -1 || !comicData || comicData.length <= currentImageIndex) return;
        
        if (confirm('Tem certeza que deseja excluir este painel?')) {
            comicData[currentImageIndex].panels.splice(selectedPanelIndex, 1);
            selectedPanelIndex = -1;
            drawImageAndPanels();
            updatePanelsList();
            updatePropertiesForm();
        }
    }
    
    // Adicionar novo painel
    addPanelBtn.addEventListener('click', function() {
        if (!comicData || comicData.length <= currentImageIndex) return;
        
        // Adicionar um painel padrão no canto superior esquerdo
        const newPanel = [10, 10, 100, 100];
        comicData[currentImageIndex].panels.push(newPanel);
        selectedPanelIndex = comicData[currentImageIndex].panels.length - 1;
        
        // Ordenar painéis de acordo com a direção de leitura
        sortPanels();
        
        // Redesenhar e atualizar
        drawImageAndPanels();
        updatePanelsList();
        updatePropertiesForm();
    });
    
    // Função para ordenar os painéis
    function sortPanels() {
        if (!comicData || comicData.length <= currentImageIndex) return;
        
        const pageData = comicData[currentImageIndex];
        const panels = pageData.panels;
        
        if (rtlCheckbox.checked || (pageData.numbering && pageData.numbering === 'rtl')) {
            // Ordem direita-para-esquerda (para mangás)
            panels.sort((a, b) => {
                // Primeiro por linha (y), depois por x decrescente
                if (a[1] !== b[1]) return a[1] - b[1];
                return b[0] - a[0];
            });
        } else {
            // Ordem esquerda-para-direita (padrão)
            panels.sort((a, b) => {
                // Primeiro por linha (y), depois por x crescente
                if (a[1] !== b[1]) return a[1] - b[1];
                return a[0] - b[0];
            });
        }
    }
    
    // Eventos de desenho no canvas
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDrawing);
    canvas.addEventListener('mouseout', endDrawing);
    
    function startDrawing(e) {
        if (!comicData || comicData.length <= currentImageIndex) return;
        
        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        isDrawing = true;
        
        // Criar um novo painel temporário
        comicData[currentImageIndex].panels.push([startX, startY, 0, 0]);
        selectedPanelIndex = comicData[currentImageIndex].panels.length - 1;
        drawImageAndPanels();
    }
    
    function draw(e) {
        if (!isDrawing || !comicData || comicData.length <= currentImageIndex) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const panel = comicData[currentImageIndex].panels[selectedPanelIndex];
        
        // Atualizar largura e altura do painel
        panel[2] = mouseX - panel[0];
        panel[3] = mouseY - panel[1];
        
        // Garantir que as dimensões não sejam negativas
        if (panel[2] < 0) {
            panel[0] += panel[2];
            panel[2] = Math.abs(panel[2]);
        }
        
        if (panel[3] < 0) {
            panel[1] += panel[3];
            panel[3] = Math.abs(panel[3]);
        }
        
        drawImageAndPanels();
    }
    
    function endDrawing() {
        isDrawing = false;
        
        if (selectedPanelIndex !== -1) {
            const panel = comicData[currentImageIndex].panels[selectedPanelIndex];
            
            // Remover painel se for muito pequeno
            if (panel[2] < 10 || panel[3] < 10) {
                comicData[currentImageIndex].panels.splice(selectedPanelIndex, 1);
                selectedPanelIndex = -1;
            }
            
            drawImageAndPanels();
            updatePanelsList();
            updatePropertiesForm();
        }
    }
    
    // Salvar JSON modificado
    saveBtn.addEventListener('click', function() {
        if (!comicData) {
            alert('Nenhum dado para salvar');
            return;
        }
        
        // Ordenar painéis antes de salvar
        sortPanels();
        
        const jsonStr = JSON.stringify(comicData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'comic_panels_modified.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Atualizar ordenação quando o checkbox muda
    rtlCheckbox.addEventListener('change', function() {
        if (!comicData || comicData.length <= currentImageIndex) return;
        
        sortPanels();
        drawImageAndPanels();
        updatePanelsList();
    });
});