# Checklist de Funcionalidades

## Modal

[ ] o modal abre corretamente com os dados
[ ] os botões de fechar funcionam
[ ] os botões personalizados funcionam
[ ] a pilha de modais funciona

## Sidebar

[ ] a lista de livros carrega corretamente ao inicializar
[ ] a lista de livros atualiza automaticamente os títulos
[ ] a lista de livros atualiza automaticamente exclusões e adições
[ ] a mudança de projeto pela lista de livros funciona

## Explorer

[ ] ao inicializar a árvore do último projeto aberto é renderizada
[ ] a árvore de arquivos foi renderizada corretamente
[ ] a navegação por tabs funciona corretamente
[ ] a árvore de arquivos atualiza corretamente ao mudar de livro/projeto
[ ] pastas abrem e fecham corretamente
[ ] ocultar e exibir arquivos e pastas avançados funciona
[ ] apenas arquivos permitidos são exibidos
[ ] o nome dos arquivos .temp tem prioridade sobre o .md
[ ] na inicialização arquivos .temp possuem um (asterisk) no título
[ ] novos arquivos .temp adicionam (asterisk) aos respectivos arquivos automaticamente
[ ] após sincronização de arquivos .temp remove (*) dos respectivos arquivos
[ ] adição de arquivos temp são atualizados em tempo real
[ ] remoção de arquivos temp são atualizados em tempo real
[ ] estilos de arquivo visível, avançado e somente leitura estão aplicadas
[ ] ao abrir um arquivo a árvore sempre altera de tab, abre as pastas e seleciona o arquivo respectivo automaticamente

## Chat

[ ] drawer do chat abre e fecha
[ ] animação de fundo estrelado parallax funciona
[ ] focus automático na textarea funciona
[ ] especificações de redimensionamento da textarea funciona
[ ] o usuário consegue postar mensagens
[ ] o usuário consegue receber mensagens
[ ] o histórico é salvo corretamente
[ ] o histórico é restaurado para cada projeto na inicialização
[ ] o histórico é restaurado na mudança de projeto
[ ] IA mockada responde com mensagens aleatórias que simulam uma conversa, mas salva nos logs

## Settings

[ ] a drawer de settings abre e fecha corretamente
[ ] o overlay é exibido e omitido juntamente com a drawer
[ ] o switch reflete o status do tema inicial (dark|light)
[ ] o switch alterna corretamente entre os temas

## Editor

[ ] o editor (toastui) é inicializado corretamente
[ ] o tema é aplicado ao editor na inicialização
[ ] o tema é aplicado na alteração de tema global
[ ] ao selecionar um arquivo ele abre no editor
[ ] o arquivo .temp tem prioridade sobre o .md
[ ] links com caminhos relativos redirecionam para os respectivos arquivos
[ ] após edição de um arquivo ele é automaticamente salvo em um arquivo .temp

## Editor Overlay

[ ] na inicialização ou em troca de projetos se um projeto estiver bloqueado pela IA bloqueia o editor e ativa o overlay
[ ] quando um projeto aberto é bloqueado, ativa o bloqueio em tempo real
[ ] quando um projeto aberto é desbloqueado, desativa o bloqueio em tempo real
[ ] quando não há arquivo selecionado, ativa o overlay
[ ] quando há mais de 1 overlay do editor, gerencia a pilha corretamente

## Toolbar

[ ] inicia com campo de status sempre oculto
[ ] oculta campo de status ao mudar entre arquivos
[ ] emite status pendente enquanto usuário digita
[ ] emite status salvando quando executa salvamento
[ ] emite status salvo quando arquivo .temp foi criado ou atualizado
[ ] ativa botão de sincronizar se houver ao menos 1 arquivo .temp a ser sincronizado no projeto atual
[ ] desativa botão de sincronizar quando não há arquivos .temp no projeto atual
[ ] botão de sincronizar possui animação funcionando

# Toast

[ ] exibe corretamente as mensagens e aparência desejada
