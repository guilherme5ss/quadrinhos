import os
from prompt_toolkit import prompt
from prompt_toolkit.shortcuts import input_dialog
import shutil #simplificar_pasta()
import subprocess
import cv2

def renomear_pastas(diretorio_raiz): # Percorre um diretorio para renomear pastas
    """
    diretorio = "caminho"

    # Exemplo de uso
    if __name__ == "__main__":
        diretorio = input("Digite o caminho do diretório raiz: ").strip()
        if os.path.isdir(diretorio):
            renomear_pastas(diretorio)
        else:
            print("Diretório inválido.")
    """
    for raiz, pastas, arquivos in os.walk(diretorio_raiz):
        for pasta in pastas:
            caminho_atual = os.path.join(raiz, pasta)
            print(f"\nPasta encontrada: {caminho_atual}")
            novo_nome = prompt(f"Novo nome para a pasta:", default=pasta)
            novo_nome = novo_nome.strip()
            if novo_nome and novo_nome != pasta:
                novo_caminho = os.path.join(raiz, novo_nome)
                try:
                    os.rename(caminho_atual, novo_caminho)
                    print(f"Renomeado para: {novo_caminho}")
                except Exception as e:
                    print(f"Erro ao renomear: {e}")

def renomear_arquivos(diretorio_raiz): # Percorre um diretorio para renomear arquivos
    """
    diretorio = "caminho"

    # Exemplo de uso
    if __name__ == "__main__":
        diretorio = input("Digite o caminho do diretório raiz: ").strip()
        if os.path.isdir(diretorio):
            renomear_arquivos(diretorio)
        else:
            print("Diretório inválido.")
    """
    for raiz, pastas, arquivos in os.walk(diretorio_raiz):
        for arquivo in arquivos:
            caminho_atual = os.path.join(raiz, arquivo)
            nome_base, extensao = os.path.splitext(arquivo)
            print(f"\nArquivo encontrado: {caminho_atual}")
            novo_nome_base = prompt(f"Novo nome para o arquivo:", default=nome_base)
            novo_nome_base = novo_nome_base.strip()

            if novo_nome_base and novo_nome_base != nome_base:
                novo_nome_completo = novo_nome_base + extensao
                novo_caminho = os.path.join(raiz, novo_nome_completo)
                try:
                    os.rename(caminho_atual, novo_caminho)
                    print(f"Renomeado para: {novo_caminho}")
                except Exception as e:
                    print(f"Erro ao renomear: {e}")

def simplificar_pasta(pasta_principal): # Simplifica a estrutura de pastas
    """
    Essa estrutura de pastas, por exemplo: pasta0/pasta1/pasta2/arquivos.

    O código percorre as pastas, descendo até encontrar uma subpasta, e continua 
    esse processo até localizar os arquivos. 
    Em seguida, ele move todos os arquivos para a pasta inicial (pasta0), 
    removendo as pastas vazias no caminho

    """
    
    """
    # Exemplo de uso

    caminho = "E:\Programação\Python\Quadrinhos\pages\Invencível"
    for nome in os.listdir(caminho):
        caminho_completo = os.path.join(caminho, nome)
        if os.path.isdir(caminho_completo):
            simplificar_pasta(caminho_completo)
    """



    atual = pasta_principal

    # Desce enquanto houver apenas uma pasta
    while True:
        conteudo = os.listdir(atual)

        # Se não há nada, para
        if not conteudo:
            print(f"Pasta {atual} está vazia.")
            break
        
        # Se houver mais de um item, também para
        if len(conteudo) != 1:
            print(f"Pasta {atual} tem mais de um item, parando.")
            break
        
        proximo = os.path.join(atual, conteudo[0])

        # Se for uma pasta, desce
        if os.path.isdir(proximo):
            atual = proximo
        else:
            # Se for arquivo, já estamos onde precisamos
            break

    # Agora move tudo da pasta 'atual' para 'pasta_principal'
    if atual != pasta_principal:
        for item in os.listdir(atual):
            origem = os.path.join(atual, item)
            destino = os.path.join(pasta_principal, item)
            shutil.move(origem, destino)
            print(f"Movido: {origem} -> {destino}")

        # Depois limpa todas as pastas vazias que ficaram
        caminho = atual
        while caminho != pasta_principal:
            os.rmdir(caminho)
            print(f"Removida pasta vazia: {caminho}")
            caminho = os.path.dirname(caminho)
    else:
        print("Nada para simplificar.")



def arquivo_sem_extensao(caminho): # Extrai o nome do arquivo sem a extensão a partir de um caminho de arquivo fornecido.
    """
    Argumentos:
        caminho: O caminho para o arquivo.

    Retorna:
        Nome do arquivo sem a extensão.
    """
    return os.path.splitext(os.path.basename(caminho))[0]


def json_diretorio(diretorio_raiz, diretorio_saida): # Gera arquivos .json de pastas com kumiko
    for raiz, pastas, arquivos in os.walk(diretorio_raiz):
        for pasta in pastas:
            caminho_entrada = os.path.join(raiz, pasta)
            caminho_saida = diretorio_saida +"\\"+ arquivo_sem_extensao(caminho_entrada) + ".json"
            comando =  ["python", "kumiko", "-i", caminho_entrada, "-o", caminho_saida]

            # Executando o comando
            processo = subprocess.run(comando, shell=True, text=True, capture_output=True)
            # Exibindo a saída do comando
            print("Saída do comando:")
            print(processo.stdout)
        
            # Exibindo erros, se houver
            if processo.stderr:
                print("Erros:")
                print(processo.stderr)
