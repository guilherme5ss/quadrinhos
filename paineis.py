import os
import sys
import json
import cv2 as cv
import fitz  # PyMuPDF
from PIL import Image

def save_panels_from_json(json_path, images_folder, output_base_path='saida', output_format='jpg'): # Segmenta um quadrinho a partir de um arquivo .json
    # Verificações iniciais
    if not os.path.exists(json_path):
        print(f"[ERROR] JSON file not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    if not os.path.isdir(images_folder):
        print(f"[ERROR] Images folder not found: {images_folder}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_base_path, exist_ok=True)

    # Carrega os dados do JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    nb_written_panels = 0

    for page in data:
        filename = page.get("filename")
        panels = page.get("panels", [])
        image_path = os.path.join(images_folder, filename)

        if not os.path.isfile(image_path):
            print(f"[WARNING] Image not found: {image_path}", file=sys.stderr)
            continue

        img = cv.imread(image_path)
        if img is None:
            print(f"[ERROR] Failed to read image: {image_path}", file=sys.stderr)
            continue

        output_path = os.path.join(output_base_path, os.path.splitext(os.path.basename(image_path))[0])
        os.makedirs(output_path, exist_ok=True)

        for i, panel in enumerate(panels):
            if len(panel) != 4:
                print(f"[WARNING] Invalid panel data at {filename} index {i}: {panel}", file=sys.stderr)
                continue

            x, y, w, h = panel
            cropped = img[y:y+h, x:x+w]
            output_file = os.path.join(output_path, f"panel_{i}.{output_format}")

            if cv.imwrite(output_file, cropped):
                nb_written_panels += 1
            else:
                print(f"[ERROR] Failed to write panel image to {output_file}", file=sys.stderr)

    print(f"✅ Saved {nb_written_panels} panel images to '{output_base_path}'", file=sys.stderr)

# save_panels_from_json(json_path=r"json\Y\vol1_edit.json", 
#                      images_folder=r"pages\Y\Volume1", 
#                      output_base_path=r"pages\paineis\Y\\1", 
#                      output_format='png')

def generate_pdf_with_pymupdf(panels_base_path, output_pdf_path='painels_saida.pdf'): #Gera um pdf a partir de um diretorio de imagens
    doc = fitz.open()

    folders = sorted(os.listdir(panels_base_path))
    for folder in folders:
        folder_path = os.path.join(panels_base_path, folder)
        if not os.path.isdir(folder_path):
            continue

        panels = sorted(os.listdir(folder_path))
        for panel_file in panels:
            panel_path = os.path.join(folder_path, panel_file)

            try:
                # Abre a imagem e obtém dimensões
                image = Image.open(panel_path)
                width, height = image.size

                # Cria uma nova página com tamanho da imagem
                page = doc.new_page(width=width, height=height)

                # Insere imagem na página
                rect = fitz.Rect(0, 0, width, height)
                page.insert_image(rect, filename=panel_path)

            except Exception as e:
                print(f"[ERROR] Falha ao adicionar painel {panel_path}: {e}")

    # Salva o PDF
    doc.save(output_pdf_path)
    doc.close()
    print(f"✅ PDF gerado com sucesso: {output_pdf_path}")

#generate_pdf_with_pymupdf(r"pages\paineis\Y\\1", 'painels_final.pdf')
