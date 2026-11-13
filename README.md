# Lumen Society: First Light — Simulation Core + Ilha Interativa v0.4

Protótipo independente do Replit para desenvolver o primeiro morador autônomo de Lumen Society.

## Requisitos
- Node.js 20 ou superior.
- A cena 3D usa Three.js 0.170.0 por CDN; é necessária conexão com a internet para carregar a biblioteca no navegador.

## Executar
1. Extraia a pasta do projeto.
2. Abra um terminal dentro dela.
3. Execute `npm start`.
4. Acesse `http://localhost:3000` no navegador.

Para desenvolvimento com reinício automático: `npm run dev`.

## Testes
Execute `npm test`.

## O que existe no protótipo 0.4
- Ilha Low Poly 3D isométrica com praça, cabana, jardim, bosque, praia e píer.
- Seleção de áreas por toque/clique e botões acessíveis para telas pequenas.
- Morador autônomo Milo com necessidades de energia, companhia, diversão, alimentação e conforto.
- Tarefas de exploração, socialização, trabalho, coleta de madeira/pedra/comida e construção.
- Coleta entrega materiais ao inventário apenas quando a atividade termina.
- Construções disponíveis: banco de jardim (5 madeira + 2 pedra), canteiro florido (3 madeira + 2 comida) e fogueira (4 madeira + 3 pedra).
- Materiais são reservados pelas construções enfileiradas para impedir que o jogador gaste duas vezes o mesmo estoque.
- Quando uma construção termina, os materiais são descontados, o objeto é salvo no estado e aparece na cena 3D na próxima atualização.
- Necessidades urgentes podem interromper uma tarefa; a tarefa fica preservada para retomada.
- Persistência local em `data/resident.json`, com gravação atômica via arquivo temporário.
- Recuperação lógica após downtime por timestamps, limitada a sete dias por atualização.
- Website responsivo e estrutura PWA instalável em navegadores compatíveis. A API permanece online e a cena 3D usa CDN.

## API
- `GET /api/health` — estado do serviço.
- `GET /api/resident` — sincroniza o tempo decorrido e retorna o estado persistido.
- `POST /api/tasks` — adiciona tarefa. Exemplos:
  - `{ "type": "gather_wood" }`
  - `{ "type": "gather_stone" }`
  - `{ "type": "gather_food" }`
  - `{ "type": "build", "structureId": "bench" }`
  - `{ "type": "build", "structureId": "flowerbed" }`
  - `{ "type": "build", "structureId": "campfire" }`
  - Também aceita `explore`, `socialize` e `work`.
- `POST /api/reset` — reinicia o morador de demonstração (somente desenvolvimento).

## Website e APK Android
A versão 0.5 inclui um wrapper Android nativo com WebView em `android/`, além de workflow GitHub Actions para compilar um APK de demonstração. O app usa modo de demonstração local (sem backend), apenas para visualizar a interface e experimentar ações básicas; esse estado não sincroniza com o website. Para compilar, consulte `ANDROID_BUILD.md`. O APK precisa ser gerado por Android Studio ou GitHub Actions, pois o ambiente de desenvolvimento deste pacote não contém Android SDK/Gradle.

## Persistência e limitações
O armazenamento JSON serve apenas para protótipo de um morador e um processo. Antes de multiplayer/produção, migrar para PostgreSQL/Supabase, adicionar transações/controle de concorrência distribuído, autenticação, autorização, backups e monitoramento. Se o host suspender o processo, nenhum código roda durante a suspensão; ao voltar, o backend calcula a evolução lógica usando timestamps. Isso não é execução contínua real durante o desligamento.

## Estrutura
- `android/` — projeto Android nativo de demonstração.
- `.github/workflows/build-android-apk.yml` — compilação remota do APK.
- `ANDROID_BUILD.md` — instruções para gerar e instalar o APK.
- `src/simulation.js` — regras e evolução do morador.
- `src/store.js` — persistência local.
- `src/server.js` — servidor HTTP e API.
- `public/` — interface, PWA e cena Three.js.
- `test/` — testes automatizados.
- `data/` — estado persistido criado na primeira execução.

## Próximas etapas sugeridas
1. Fazer o Milo visitar visualmente os pontos de coleta e construção de acordo com cada tarefa.
2. Adicionar objetos clicáveis e interações locais (examinar, plantar, descansar).
3. Personalização visual do avatar e interior da cabana.
4. Migrar persistência para banco de dados e adicionar autenticação.
5. Preparar wrapper Android com Capacitor e integração Discord.
