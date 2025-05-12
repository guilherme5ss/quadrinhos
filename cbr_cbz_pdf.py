import os
import zipfile
import subprocess
import fitz  # PyMuPDF

# Caminho para o executável 7z.exe
SETE_ZIP_EXE = r'C:\Program Files\7-Zip\7z.exe'  # ajuste conforme necessário

def extrair_cbz_cbr_pdf(arquivo, pasta_saida): #Extrai em uma pasta imagens/páginas de arquivos .cbz, .cbr e .pdf
    """# Exemplo de uso
    arquivo = "arquivo"
    nome_arquivo = os.path.splitext(os.path.basename(arquivo))[0]
    extrair_cbz_cbr_pdf(arquivo, ("saida\\"+nome_arquivo))
    """
    nome_base = os.path.splitext(os.path.basename(arquivo))[0]
    pasta_destino = os.path.join(pasta_saida, nome_base)

    if not os.path.exists(pasta_destino):
        os.makedirs(pasta_destino)

    if arquivo.lower().endswith('.cbz'):
        with zipfile.ZipFile(arquivo, 'r') as zip_ref:
            zip_ref.extractall(pasta_destino)
            print(f"Extraído: {arquivo}")
    elif arquivo.lower().endswith('.cbr'): # Adicionar uma caixa de dialogo para fazer download 7zip
        comando = [SETE_ZIP_EXE, 'x', '-o' + pasta_destino, arquivo, '-y']
        subprocess.run(comando, check=True)
        print(f"Extraído CBR com 7-Zip: {arquivo}")
    elif arquivo.lower().endswith('.pdf'): 
        pdf_document = fitz.open(arquivo)
        os.makedirs(pasta_saida, exist_ok=True)

        total_paginas = len(pdf_document)
        num_digitos = len(str(total_paginas))  # Define a quantidade de dígitos necessária

        for page_num in range(total_paginas):
            page = pdf_document[page_num]
            pix = page.get_pixmap(dpi=300)
            numero_formatado = str(page_num + 1).zfill(num_digitos)
            output_image_path = os.path.join(pasta_saida, f"page_{numero_formatado}.png")
            pix.save(output_image_path)
            print(f"Página {page_num + 1} salva como {output_image_path}")

        pdf_document.close()

    else:
        print(f"Formato não suportado: {arquivo}")
'''#Rotina para uma pasta com varios arquivos:
pasta = "caminho"
for nome_arquivo in os.listdir(pasta):
    caminho_completo = os.path.join(pasta, nome_arquivo)
    if os.path.isfile(caminho_completo):
        nome_arquivo = os.path.splitext(os.path.basename(caminho_completo))[0]
        extrair_cbz_cbr_pdf(caminho_completo, ("sida\\"+nome_arquivo))'''
        

