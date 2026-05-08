# Wuthering Waves Draft Overlay

Aplicação desktop moderna para seleção de personagens do jogo **Wuthering Waves**, construída com **Electron** para melhor performance e compatibilidade.

## ✨ Funcionalidades

- **Design Glassmorphism**: Visual premium com blur, transparência e efeitos modernos
- **Layout Compacto**: Cards circulares organizados por elemento
- **Janela Frameless**: Sem bordas do Windows, sempre no topo
- **Dark Theme**: Tema escuro profissional
- **Seleção Múltipla**: Selecione personagens e defina ressonância (0-6)
- **Exportação JSON**: Salve suas seleções
- **Animações Fluidas**: Transições e hover effects suaves

## 🚀 Começar

### Requisitos
- **Node.js 14+** ([Baixar aqui](https://nodejs.org/))

### Instalação (Windows)
```bash
start_overlay_electron.bat
```

Ou manualmente:
```bash
npm install
npm start
```

## 📖 Documentação

- **[ELECTRON_GUIDE.md](ELECTRON_GUIDE.md)** - Guia completo de uso
- **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** - Detalhes técnicos da migração
- Controles de janela customizados
- Funciona como aplicação nativa

### 🌐 Modo Desenvolvimento (Navegador)
- Servidor HTTP local automático
- Interface idêntica
- Suporte completo a todas as funcionalidades
- Ideal para desenvolvimento e testes

## Funcionalidades por Modo

| Funcionalidade | Desktop | Navegador |
|---|---|---|
| Seleção de personagens | ✅ | ✅ |
| Dropdown de ressonância | ✅ | ✅ |
| Exportar JSON | ✅ | ✅ (Download) |
| Controles de janela | ✅ | ❌ |
| Drag da janela | ✅ | ❌ |
| Sempre no topo | ✅ | ❌ |

## Controles da Aplicação

- **Mover Janela**: Arraste a barra de título customizada para reposicioná-la
- **Minimizar**: Clique no botão "-" na barra de título
- **Fechar**: Clique no botão "✕" na barra de título
- **Seleção**: Clique nos cards dos personagens para marcar/desmarcar
- **Ressonância**: Use o dropdown em cada card para definir o nível (0-6)
- **Controles**:
  - **Selecionar Todos**: Marca todos os personagens
  - **Limpar Seleção**: Desmarca todos os personagens
  - **Exportar Seleção**: Salva um arquivo `selected_characters.json` com os personagens selecionados e suas ressonâncias

## Arquivos do Projeto

- `overlay_app.py` - Backend Python com PyWebView
- `index.html` - Estrutura HTML da interface
- `styles.css` - CSS com design glassmorphism e animações
- `script.js` - JavaScript para interações e comunicação com Python
- `resonators.json` - Dados dos personagens
- `Icons/` - Pasta com ícones dos elementos e personagens
- `start_overlay_desktop.bat` - Script de inicialização

## Requisitos

- Python 3.8+ (recomendado 3.11-3.13 para melhor compatibilidade)
- PyWebView
- Navegador web (para fallback de desenvolvimento)

## Estrutura de Dados

O arquivo `resonators.json` contém:
```json
[
  {
    "id": "character-id",
    "name": "Character Name",
    "element": "Element",
    "rarity": 5
  }
]
```

O arquivo exportado `selected_characters.json` inclui:
```json
[
  {
    "id": "character-id",
    "name": "Character Name",
    "element": "Element",
    "rarity": 5,
    "selected_resonance": 6
  }
]
```

## Desenvolvimento

Para modificar o visual, edite `styles.css`. Para adicionar funcionalidades, modifique `script.js`. A comunicação com Python é feita via `window.pywebview.api`.

## Troubleshooting

- **Erro de compatibilidade**: Use Python 3.11 ou 3.12
- **Janela não abre**: Verifique se PyWebView está instalado corretamente
- **Imagens não carregam**: Verifique os caminhos em `Icons/`
- **Fallback web**: Abra `index.html` no navegador para testar a interface
- `resonators.json` - Dados dos personagens
- `Icons/ResonatorsIcons/` - Imagens dos personagens
- `start_overlay_desktop.bat` - Script para iniciar a aplicação

## Dados dos personagens

O arquivo `resonators.json` contém informações sobre cada personagem:
- `id`: Identificador único
- `name`: Nome do personagem
- `element`: Elemento (Aero, Electro, Fusion, Glacio, Havoc, Spectro)
- `rarity`: Raridade (4 ou 5 estrelas)
- `ressonance`: Array de ressonâncias [0,1,2,3,4,5,6]
- `Icons/ResonatorsIcons/` - Imagens dos personagens

## Dados dos personagens

O arquivo `resonators.json` contém informações sobre cada personagem:
- `id`: Identificador único
- `name`: Nome do personagem
- `element`: Elemento (Aero, Electro, Fusion, Glacio, Havoc, Spectro)
- `rarity`: Raridade (4 ou 5 estrelas)
- `ressonance`: Array de ressonâncias [0,1,2,3,4,5,6]