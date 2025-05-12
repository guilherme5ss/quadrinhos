# https://github.com/manga109/panel-order-estimator

import fitz  # PyMuPDF
import cv2
import numpy as np
import os

# Função para extrair páginas do PDF como imagens coloridas
def extract_images_from_pdf(pdf_path, output_folder):
    pdf_document = fitz.open(pdf_path)
    os.makedirs(output_folder, exist_ok=True)

    for page_num in range(len(pdf_document)):
        page = pdf_document[page_num]
        pix = page.get_pixmap(dpi=300)
        output_image_path = os.path.join(output_folder, f"page_{page_num + 1}.png")
        pix.save(output_image_path)
        print(f"Página {page_num + 1} salva como {output_image_path}")

    pdf_document.close()

# Função para detectar e salvar painéis
def detect_panels(image_path, output_folder, page_num):
    os.makedirs(output_folder, exist_ok=True)
    image = cv2.imread(image_path)  # Lê a imagem colorida
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Verificar se é a capa
    if page_num == 1:  # Se for a primeira página, trate como capa
        panel_path = os.path.join(output_folder, "cover.png")
        cv2.imwrite(panel_path, image)
        print(f"Capa salva como {panel_path}")
        return

    # Aplicar binarização adaptativa para painéis complexos
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )

    # Detectar bordas combinando binarização e Canny
    edges = cv2.Canny(thresh, 50, 150)

    # Encontrar contornos
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Ordenar contornos por área (maiores primeiro)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    panel_count = 0

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)

        # Ignorar elementos pequenos
        if w > 100 and h > 100:
            # Verificar painéis muito grandes (como capas ou painéis duplos)
            if w > image.shape[1] * 0.8 and h > image.shape[0] * 0.8:
                large_panel_path = os.path.join(output_folder, f"large_panel_{panel_count}.png")
                cv2.imwrite(large_panel_path, image)
                print(f"Painel grande salvo como {large_panel_path}")
                panel_count += 1
                continue

            # Recortar e salvar o painel
            panel = image[y:y+h, x:x+w]
            panel_path = os.path.join(output_folder, f"panel_{panel_count}.png")
            cv2.imwrite(panel_path, panel)
            print(f"Painel salvo como {panel_path}")
            panel_count += 1

    # Adicionar segmentação K-Means para áreas complexas
    segment_output = os.path.join(output_folder, "segmented_image.png")
    apply_kmeans_segmentation(image, segment_output)

# Função para segmentar uma imagem com K-Means
def apply_kmeans_segmentation(image, output_path):
    lab_image = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    Z = lab_image.reshape((-1, 3))
    Z = np.float32(Z)

    # Configuração do K-Means
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    K = 5  # Número de clusters
    _, labels, centers = cv2.kmeans(Z, K, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)

    # Reconstruir a imagem segmentada
    centers = np.uint8(centers)
    segmented_image = centers[labels.flatten()]
    segmented_image = segmented_image.reshape((image.shape))

    # Salvar a imagem segmentada
    cv2.imwrite(output_path, segmented_image)
    print(f"Imagem segmentada salva como {output_path}")

# Caminhos dos arquivos
pdf_path = "caminho_para_o_arquivo.pdf"  # Substitua pelo caminho do seu PDF
temp_folder = "temp_pages"
panels_folder = "extracted_panels"

# 1. Extrair páginas como imagens coloridas
#extract_images_from_pdf(pdf_path, temp_folder)

# 2. Detectar e salvar painéis de cada página
for idx, page_image in enumerate(sorted(os.listdir(temp_folder))):
    page_image_path = os.path.join(temp_folder, page_image)
    page_output_folder = os.path.join(panels_folder, os.path.splitext(page_image)[0])
    detect_panels(page_image_path, page_output_folder, idx + 1)
