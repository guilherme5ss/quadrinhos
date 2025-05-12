import os
import tkinter as tk
from tkinter import filedialog, simpledialog, messagebox

def escolher_diretorio():
    caminho = filedialog.askdirectory(title="Escolha o diretório raiz")
    if caminho:
        selecionar_modo(caminho)

def selecionar_modo(caminho):
    def renomear_arquivos():
        for raiz, pastas, arquivos in os.walk(caminho):
            for arquivo in arquivos:
                nome_base, extensao = os.path.splitext(arquivo)
                caminho_atual = os.path.join(raiz, arquivo)
                novo_nome_base = simpledialog.askstring(
                    "Renomear arquivo",
                    f"Arquivo encontrado:\n{caminho_atual}\n\nNovo nome (sem mudar a extensão):",
                    initialvalue=nome_base
                )
                if novo_nome_base and novo_nome_base.strip() != nome_base:
                    novo_nome = novo_nome_base.strip() + extensao
                    novo_caminho = os.path.join(raiz, novo_nome)
                    try:
                        os.rename(caminho_atual, novo_caminho)
                        print(f"Renomeado para: {novo_caminho}")
                    except Exception as e:
                        messagebox.showerror("Erro", f"Erro ao renomear arquivo: {e}")

        messagebox.showinfo("Concluído", "Renomeação de arquivos concluída!")

    def renomear_pastas():
        for raiz, pastas, arquivos in os.walk(caminho):
            for pasta in pastas:
                caminho_atual = os.path.join(raiz, pasta)
                novo_nome = simpledialog.askstring(
                    "Renomear pasta",
                    f"Pasta encontrada:\n{caminho_atual}\n\nNovo nome:",
                    initialvalue=pasta
                )
                if novo_nome and novo_nome.strip() != pasta:
                    novo_caminho = os.path.join(raiz, novo_nome.strip())
                    try:
                        os.rename(caminho_atual, novo_caminho)
                        print(f"Renomeado para: {novo_caminho}")
                    except Exception as e:
                        messagebox.showerror("Erro", f"Erro ao renomear pasta: {e}")

        messagebox.showinfo("Concluído", "Renomeação de pastas concluída!")

    # Criar nova janela para escolher modo
    modo_janela = tk.Toplevel()
    modo_janela.title("Escolha o que renomear")
    modo_janela.geometry("300x150")

    lbl = tk.Label(modo_janela, text="O que deseja renomear?", font=("Arial", 12))
    lbl.pack(pady=10)

    btn_arquivos = tk.Button(modo_janela, text="Arquivos", width=20, command=lambda: [modo_janela.destroy(), renomear_arquivos()])
    btn_arquivos.pack(pady=5)

    btn_pastas = tk.Button(modo_janela, text="Pastas", width=20, command=lambda: [modo_janela.destroy(), renomear_pastas()])
    btn_pastas.pack(pady=5)

def main():
    root = tk.Tk()
    root.title("Renomeador de Arquivos e Pastas")
    root.geometry("400x200")

    lbl = tk.Label(root, text="Escolha um diretório para começar", font=("Arial", 14))
    lbl.pack(pady=20)

    btn_escolher = tk.Button(root, text="Selecionar Diretório", command=escolher_diretorio, font=("Arial", 12))
    btn_escolher.pack(pady=10)

    root.mainloop()

if __name__ == "__main__":
    main()