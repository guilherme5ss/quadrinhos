import json
import matplotlib.pyplot as plt
import numpy as np
import cv2
import os
# Parte para detecção de letras/texto
import pytesseract 
from PIL import Image

def calcular_porcentagem(imagem_dimensoes, paineis): # Uso individual. Calcula a porcentagem da área ocupada pelos painéis em uma imagem.
    """
    Calcula a porcentagem da área ocupada pelos painéis em uma imagem.

    Args:
        imagem_dimensoes (list): Dimensões da imagem [largura, altura].
        paineis (list): Lista de painéis, cada um representado como [x, y, width, height].

    Returns:
        float: Porcentagem da área da imagem ocupada pelos painéis.
    """
    largura_imagem, altura_imagem = imagem_dimensoes
    area_imagem = largura_imagem * altura_imagem
    
    if area_imagem == 0:
        raise ValueError("A área da imagem não pode ser zero.")
    
    area_total_paineis = sum(painel[2] * painel[3] for painel in paineis)
    porcentagem = (area_total_paineis / area_imagem) * 100
    
    return round(porcentagem, 2)

def processar_json(arquivo_entrada, arquivo_saida): # Cria um arquivo .json com a porcentagem que os paineis ocupam na página.
    """# Exemplo de uso
    processar_json("teste.json", "saida.json")
    """
    
    with open(arquivo_entrada, 'r', encoding='utf-8') as f:
        dados = json.load(f)
    
    resultado = []
    for pagina in dados:
        porcentagem = calcular_porcentagem(pagina["size"], pagina["panels"])
        pagina_resultado = {
            "filename": pagina["filename"],
            "size": pagina["size"],
            "panel_percentage": porcentagem
        }
        resultado.append(pagina_resultado)
    
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        json.dump(resultado, f, indent=4, ensure_ascii=False)
    
    print(f"Arquivo {arquivo_saida} gerado com sucesso!")

def gerar_grafico_porcentagem(arquivo_json): # Cria um gráfico com  a porcentagem ocupada pelos paineis de cada página.
    """# Exemplo de uso
    gerar_grafico_porcentagem("saida.json")
    """
    with open(arquivo_json, 'r', encoding='utf-8') as f:
        dados = json.load(f)
    
    nomes_arquivos = [pagina["filename"] for pagina in dados]
    porcentagens = [int(pagina["panel_percentage"]) for pagina in dados]
    
    plt.figure(figsize=(10, 5))
    plt.bar(nomes_arquivos, porcentagens, color='blue')
    plt.xlabel('Páginas')
    plt.ylabel('Porcentagem de Painéis (%)')
    plt.title('Porcentagem de Painéis por Página')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.show()

def gerar_imagem_nao_utilizada(arquivo_json, pasta_saida, pasta_imagens): # Função gera imagens com os paineis preenchidos com uma cor única.
    """# Exemplo de uso
    gerar_imagem_nao_utilizada("teste.json", "saida_imagens", "pages")
    """
    with open(arquivo_json, 'r', encoding='utf-8') as f:
        dados = json.load(f)
    
    if not os.path.exists(pasta_saida):
        os.makedirs(pasta_saida)
    
    for pagina in dados:
        nome_base = pagina["filename"].lstrip("-").rsplit('.', 1)[0].lstrip("0")  # Remove o traço inicial, extensão e zeros à esquerda
        nome_base = "page_"+nome_base
        formatos = [".jpg", ".png"]  # Suportar múltiplas extensões
        caminho_imagem = None
        
        for ext in formatos:
            caminho_teste = os.path.join(pasta_imagens, nome_base + ext)
            if os.path.exists(caminho_teste):
                caminho_imagem = caminho_teste
                break
        
        if caminho_imagem is None:
            print(f"Imagem {nome_base} não encontrada em formatos suportados. Pulando...")
            continue
        
        imagem = cv2.imread(caminho_imagem)
        if imagem is None:
            print(f"Erro ao carregar {caminho_imagem}. Pulando...")
            continue
        
        altura, largura, _ = imagem.shape
        print(f"Processando {nome_base}: dimensão da imagem {largura}x{altura}")
        
        for painel in pagina.get("panels", []):
            x, y, w, h = painel
            x *= 2  # Ajuste para corrigir escala
            y *= 2
            w *= 2
            h *= 2
            print(f"Painel: x={x}, y={y}, w={w}, h={h}")
            
            # Garantir que os painéis estão dentro dos limites da imagem
            x_end = min(x + w, largura)
            y_end = min(y + h, altura)
            
            imagem[y:y_end, x:x_end] = (0, 0, 0)  # Preencher os painéis com preto
        
        nome_saida = os.path.join(pasta_saida, nome_base + "_unused.png")
        cv2.imwrite(nome_saida, imagem)
    
    print(f"Imagens geradas na pasta {pasta_saida}")

# Caminho para seu Tesseract OCR, necessario no Windows. Tesseract é um software de reconhecimento ótico de caracteres
pytesseract.pytesseract.tesseract_cmd = r'E:\Arquivos de Programas\Tesseract-OCR\tesseract.exe'

def detectar_texto_em_imagem(caminho_imagem): # Função para detecção de texto em uma imagem.
    try:
        imagem = cv2.imread(caminho_imagem)
        if imagem is None:
            return False  # Arquivo não é uma imagem válida

        texto = pytesseract.image_to_string(imagem, lang='eng')  # Pode adicionar outras línguas como 'por'
        return bool(texto.strip())  # Retorna True se houver texto detectado
    except Exception as e:
        print(f"Erro ao processar {caminho_imagem}: {e}")
        return False

def listar_imagens_com_texto(pasta): # Percorre um diretorio e retorna uma lista com o nome das imagens.
    """# Exemplo de uso:
    pasta_imagens = r"E:\Imagens\Imagens\Teste"
    imagens_detectadas = listar_imagens_com_texto(pasta_imagens)

    print("Imagens que contêm texto:")
    for img in imagens_detectadas:
        print(img)
    """
    imagens_com_texto = []
    
    for arquivo in os.listdir(pasta):
        caminho_completo = os.path.join(pasta, arquivo)
        
        if os.path.isfile(caminho_completo):
            if detectar_texto_em_imagem(caminho_completo):
                imagens_com_texto.append(arquivo)

    return imagens_com_texto

def cores_pasta_imagens(pasta_imagens, pasta_saida, preto_branco=False): # Percorre uma pasta com imagens, gera e salva os histogramas em uma pasta escolhida.
    """# Exemplo de uso:
    cores_pasta_imagens("entrada", 'cores_imagens', preto_branco=False)
    """
    
    # Garantir que a pasta de saída existe
    os.makedirs(pasta_saida, exist_ok=True)
    
    # Processar cada imagem na pasta
    for nome_arquivo in os.listdir(pasta_imagens):
        caminho_imagem = os.path.join(pasta_imagens, nome_arquivo)
        
        # Verificar se é um arquivo de imagem
        if not nome_arquivo.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
            continue
        
        # Carregar a imagem
        imagem = cv2.imread(caminho_imagem)
        if imagem is None:
            print(f"Erro ao carregar {nome_arquivo}, ignorando.")
            continue
        
        imagem = cv2.cvtColor(imagem, cv2.COLOR_BGR2RGB)
        
        plt.figure(figsize=(10, 5))
        cores = ('r', 'g', 'b')
        
        if preto_branco:
            for i, cor in enumerate(cores):
                histograma = cv2.calcHist([imagem], [i], None, [256], [0, 256])
                plt.plot(histograma, color=cor, label=f'Canal {cor.upper()}')
            plt.title(f'Distribuição RGB - {nome_arquivo}')
        else:
            mascara = np.all(imagem != [0, 0, 0], axis=-1) & np.all(imagem != [255, 255, 255], axis=-1)
            if not np.any(mascara):
                print(f"Nenhum pixel colorido encontrado em {nome_arquivo}, ignorando.")
                continue
            pixels_filtrados = imagem[mascara].reshape(-1, 3).T
            for i, cor in enumerate(cores):
                histograma = cv2.calcHist([pixels_filtrados[i]], [0], None, [256], [0, 256])
                plt.plot(histograma, color=cor, label=f'Canal {cor.upper()}')
            plt.title(f'Distribuição RGB (Ignorando Preto e Branco) - {nome_arquivo}')
        
        plt.xlabel('Intensidade de cor')
        plt.ylabel('Número de pixels')
        plt.legend()
        
        # Salvar gráfico na pasta de saída
        caminho_saida = os.path.join(pasta_saida, f"histograma_{nome_arquivo}")
        plt.savefig(caminho_saida)
        plt.close()
        print(f"Histograma salvo: {caminho_saida}")
