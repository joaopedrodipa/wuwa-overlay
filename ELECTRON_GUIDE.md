# Wuthering Waves Draft Overlay - Electron Version

Uma aplicação desktop moderna para seleção de personagens do jogo Wuthering Waves, agora construída com **Electron** para melhor performance e compatibilidade multiplataforma.

## 🎯 Funcionalidades

- **Layout Compacto**: Cards circulares para ocupar menos espaço
- **Element Headers Integrados**: Primeiro card de cada elemento mostra ícone e nome
- **Janela Frameless Moderna**: Aplicação desktop sem bordas padrão
- **Sempre no Topo**: A janela permanece sobre outras aplicações
- **Glassmorphism Design**: Visual premium com blur, transparência e efeitos modernos
- **Dark Theme Premium**: Tema escuro profissional
- **Animações Suaves**: Hover effects e transições fluidas
- **Seleção de Personagens**: Seleção múltipla com ressonância configurável
- **Exportação JSON**: Exporta seleção para arquivo JSON

## ⚙️ Requisitos

- **Node.js 14+** - [Baixar aqui](https://nodejs.org/)
- **npm** (vem com Node.js)

## 🚀 Instalação e Execução

### Windows (Recomendado)

**Opção 1: Executar Script Batch (Mais fácil)**
```bash
start_overlay_electron.bat
```
Este script irá:
1. Verificar se Node.js está instalado
2. Instalar dependências automaticamente
3. Iniciar o aplicativo

**Opção 2: Usando Terminal**
```bash
npm install
npm start
```

### macOS / Linux
```bash
npm install
npm start
```

## 📝 Scripts Disponíveis

```bash
npm start           # Inicia o aplicativo em modo produção
npm run dev         # Inicia em modo desenvolvimento (abre DevTools)
npm run build       # Compila para Windows
npm run build-win   # Build específico para Windows (NSIS + Portable)
npm run build-all   # Compila para Windows, macOS e Linux
```

## 🔨 Modo Desenvolvimento

Para desenvolvimento com DevTools aberto:

```bash
npm run dev
```

## 📦 Estrutura do Projeto

```
├── main.js                      # Processo principal Electron
├── preload.js                   # Bridge seguro renderer <-> main
├── index.html                   # Página HTML principal
├── script.js                    # Lógica JavaScript (atualizado para Electron)
├── styles.css                   # Estilos da interface
├── package.json                 # Dependências e configuração
├── resonators.json              # Dados dos personagens
├── Icons/
│   ├── Attribute/              # Ícones de elementos
│   └── ResonatorsIcons/        # Ícones de personagens
└── start_overlay_electron.bat   # Script launcher para Windows
```

## 🎮 Como Usar

1. **Iniciar Aplicativo**: Execute o arquivo `.bat` ou `npm start`
2. **Selecionar Personagens**: Clique nos cards dos personagens para selecioná-los
3. **Configurar Ressonância**: Use o dropdown em cada personagem para definir ressonância (0-6)
4. **Controles**:
   - **Selecionar Todos**: Seleciona todos os personagens
   - **Limpar Seleção**: Remove todas as seleções
   - **Exportar Seleção**: Salva a seleção em `selected_characters.json`
5. **Janela**: 
   - Arraste pela barra de título para mover
   - Use os botões de controle (─ ▢ ✕) para minimizar, maximizar e fechar

## 📂 Dados Exportados

Quando você exporta uma seleção, um arquivo `selected_characters.json` é criado com a seguinte estrutura:

```json
[
  {
    "id": "sigrika",
    "name": "Sigrika",
    "element": "Aero",
    "rarity": 5,
    "selected_resonance": 3
  }
]
```

## 🔧 Construir Executável

Para criar um instalador Windows:

```bash
npm run build-win
```

Os arquivos compilados estarão em `dist/`.

## 🐛 Solução de Problemas

### "Node.js não está instalado"
- Instale Node.js de https://nodejs.org/ (versão LTS recomendada)
- Reinicie seu computador após a instalação
- Abra um novo terminal após a instalação

### "Erro ao instalar dependências"
- Delete a pasta `node_modules`: `rmdir /s /q node_modules`
- Delete o arquivo `package-lock.json`
- Execute novamente: `npm install`

### Janela não aparece
- Verifique o console para mensagens de erro (`npm run dev`)
- Certifique-se de que `resonators.json` existe no mesmo diretório

### Ícones não aparecem
- Certifique-se de que a pasta `Icons/` está presente
- Verifique se os arquivos de imagem estão em `Icons/ResonatorsIcons/` e `Icons/Attribute/`

## 📋 Diferenças da Versão PyWebView

- ✅ **Melhor Performance**: Electron é geralmente mais rápido que PyWebView
- ✅ **Compatibilidade**: Funciona consistentemente em todas as versões do Windows
- ✅ **Atualizações Automáticas**: Suporte nativo (pode ser adicionado)
- ✅ **Build Standalone**: Cria executável sem dependências externas
- ⚠️ **Tamanho**: Aplicativo Electron é maior (~150MB) vs PyWebView (~50MB)

## 📄 Licença

MIT

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se livre para abrir issues ou pull requests.
