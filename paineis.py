import os
import sys
import json
import cv2 as cv
import fitz  # PyMuPDF
from PIL import Image
from ebooklib import epub

def recortar_paineis_json(json_path, images_folder, output_base_path='saida', output_format='jpg'): # Segmenta um quadrinho a partir de um arquivo .json
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

def gerar_pdf_paineis(panels_base_path, output_pdf_path='painels_saida.pdf'): # Gera um pdf a partir de um diretorio de imagens
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

def gerar_epub_paineis(panels_base_path, output_epub_path='painels_saida.epub', title="Paineis"): # Gera um epub a partir de um diretorio de imagens
    book = epub.EpubBook()
    book.set_identifier('comic-id')
    book.set_title(title)
    book.set_language('pt')
    book.add_author('Autor Desconhecido')

    spine = ['nav']
    toc = []

    folders = sorted(os.listdir(panels_base_path))
    chapter_count = 1

    for folder in folders:
        folder_path = os.path.join(panels_base_path, folder)
        if not os.path.isdir(folder_path):
            continue

        panels = sorted(os.listdir(folder_path))
        for panel_file in panels:
            panel_path = os.path.join(folder_path, panel_file)
            try:
                img_data = open(panel_path, 'rb').read()
                image_name = f"img_{chapter_count}.jpg"

                img_item = epub.EpubItem(uid=image_name, file_name=image_name, media_type='image/jpeg', content=img_data)
                book.add_item(img_item)

                html_content = f'<html><body><img src="{image_name}" alt="Panel {chapter_count}" /></body></html>'
                c = epub.EpubHtml(title=f'Painel {chapter_count}', file_name=f'chap_{chapter_count}.xhtml', content=html_content)
                book.add_item(c)
                spine.append(c)
                toc.append(c)

                chapter_count += 1
            except Exception as e:
                print(f"[ERROR] Skipping {panel_path}: {e}")

    book.toc = tuple(toc)
    book.spine = spine
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    epub.write_epub(output_epub_path, book)
    print(f"✅ EPUB salvo em: {output_epub_path}")

recortar_paineis_json(json_path=r"json\Y\vol2_edit.json", 
                     images_folder=r"pages\Y\Volume2", 
                     output_base_path=r"pages\paineis\Y\\2", 
                     output_format='png')

# Para gerar o PDF:
gerar_pdf_paineis(r"pages\paineis\Y\\2", 'Paineis Y Volume 2.pdf')

# Para gerar o EPUB:
gerar_epub_paineis(r"pages\paineis\Y\\2", 'Paineis Y Volume 2.epub')