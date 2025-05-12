import os
import re
import subprocess

# lidar com caminhos cuja pasta possua caracteres com acento

# https://github.com/njean42/kumiko/blob/master/doc/Usage.md
#The size gives us the [width,height] of our image, in pixels.
#The panel details are also expressed in pixels. 
# The 4 values representing a panel are given in the following order: 
#   [x,y,width,height], with x and y representing the top-left corner of the panel.
# Panels are sorted in left-to-right reading order by default. Add the --rtl option to have them sorted in right-to-left reading order (e.g. mangas).

# Função para extrair números dos nomes de arquivos
def extrair_numero(arquivo):
    # Expressão regular para capturar números no nome do arquivo
    match = re.search(r'(\d+)', arquivo)
    return int(match.group(1)) if match else float('inf')  # Retorna o número ou um valor alto se não encontrar número

paginas = r'pages'
#paginas = r'E:\Programação\Python\Quadrinhos\pages'

arquivos = os.listdir(paginas)

saida = "Saida"

# https://stackoverflow.com/questions/73545218/utf-8-encoding-exception-with-subprocess-run/73546303#73546303
for page_image in sorted(arquivos, key=extrair_numero):
    #comando = 'python kumiko -i "'+paginas+'\\'+page_image+'"'+" -s "+" "+saida
    comando = ["python", "kumiko", "-i", paginas]
    print(comando)
    # Executando o comando
    processo = subprocess.run(comando, shell=True, text=True, capture_output=True)

    # Exibindo a saída do comando
    print("Saída do comando:")
    print(processo.stdout)

    # Exibindo erros, se houver
    if processo.stderr:
        print("Erros:")
        print(processo.stderr)
