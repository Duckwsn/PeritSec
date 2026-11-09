import type { CompetencyId } from '../lib/progress'
import type { Difficulty, Exercise } from '../lib/exercises'

export type ContentBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'code'; label?: string; code: string }
  | {
      kind: 'callout'
      tone: 'nota' | 'atencao' | 'limite'
      title: string
      text: string
    }
  | { kind: 'table'; caption?: string; headers: string[]; rows: string[][] }
  | { kind: 'steps'; title?: string; steps: Array<{ title: string; text: string }> }
  | {
      kind: 'figure'
      figure: 'encapsulation' | 'handshake' | 'dns-flow' | 'triage'
      caption: string
    }

export interface Lesson {
  id: string
  trackId: string
  moduleId: string
  order: number
  title: string
  eyebrow: string
  summary: string
  minutes: number
  difficulty: Difficulty
  competency: CompetencyId
  objectives: string[]
  prerequisites: string[]
  blocks: ContentBlock[]
  exercises: Exercise[]
  takeaways: string[]
}

export interface TrackModule {
  id: string
  title: string
  summary: string
  status: 'disponivel' | 'em-expansao'
  lessonIds: string[]
  labIds?: string[]
  caseIds?: string[]
}

export interface Track {
  id: string
  code: string
  title: string
  tagline: string
  description: string
  competency: CompetencyId[]
  modules: TrackModule[]
  outcome: string
}

export const lessons: Lesson[] = [
  {
    id: 'caminho-do-pacote',
    trackId: 'redes',
    moduleId: 'redes-fundamentos',
    order: 1,
    title: 'O caminho de um pacote',
    eyebrow: 'Modelos em uso, não em exposição',
    summary:
      'Use OSI e TCP/IP para explicar o que acontece entre digitar um endereço e receber uma página. Camadas, encapsulamento e o primeiro teste de diagnóstico.',
    minutes: 14,
    difficulty: 'iniciante',
    competency: 'redes',
    objectives: [
      'Relacionar as camadas OSI e TCP/IP a evidências concretas, como um quadro Ethernet ou uma porta TCP.',
      'Descrever encapsulamento e desencapsulamento em uma requisição HTTP.',
      'Escolher um primeiro teste coerente quando um sintoma aparece.',
    ],
    prerequisites: ['Nenhum. Esta é a porta de entrada da trilha.'],
    blocks: [
      {
        kind: 'paragraph',
        text: 'Modelos de rede não existem para decorar nomes. Eles servem para **localizar responsabilidade**. Quando algo falha, a pergunta útil é: em qual camada o comportamento deixa de corresponder ao esperado? Um cabo, um endereço IP, uma porta e um certificado produzem sintomas diferentes.',
      },
      {
        kind: 'figure',
        figure: 'encapsulation',
        caption:
          'Cada camada adiciona informações de controle. No receptor, o processo inverso remove cabeçalhos até entregar os dados à aplicação.',
      },
      {
        kind: 'heading',
        text: 'Duas referências, um mesmo caminho',
      },
      {
        kind: 'table',
        headers: ['Camada OSI', 'TCP/IP', 'Unidade de dados', 'Exemplo observável'],
        rows: [
          ['Aplicação, apresentação e sessão', 'Aplicação', 'Mensagem / dados', 'HTTP, TLS, DNS'],
          ['Transporte', 'Transporte', 'Segmento / datagrama', 'TCP, UDP, portas'],
          ['Rede', 'Internet', 'Pacote', 'IPv4, IPv6, ICMP, roteamento'],
          ['Enlace', 'Acesso à rede', 'Quadro', 'Ethernet, MAC, VLAN'],
          ['Física', 'Acesso à rede', 'Bits / sinal', 'Cabo, rádio, óptica'],
        ],
      },
      {
        kind: 'paragraph',
        text: 'O navegador gera uma requisição HTTP. O TLS protege o conteúdo. O TCP acrescenta portas e controle de entrega. O IP acrescenta endereços lógicos. O Ethernet monta um quadro com endereços MAC e o transmite no meio físico. Isso é **encapsulamento**.',
      },
      {
        kind: 'callout',
        tone: 'nota',
        title: 'O endereço MAC não atravessa o roteador',
        text: 'O pacote IP mantém origem e destino lógicos de ponta a ponta. Os endereços MAC mudam a cada enlace: a estação entrega o quadro ao MAC do gateway; o roteador cria um novo quadro para o próximo salto.',
      },
      {
        kind: 'heading',
        text: 'Como reconhecer efeitos no mundo real',
      },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Nome não resolve',
            text: 'O navegador informa que não encontrou o servidor. Teste o mesmo destino por IP e consulte o DNS antes de suspeitar do servidor web.',
          },
          {
            title: 'IP responde, nome falha',
            text: 'A conectividade básica existe. O problema tende a estar na resolução de nomes, na configuração de DNS ou na zona consultada.',
          },
          {
            title: 'Nenhum destino remoto responde',
            text: 'Verifique endereço, máscara e gateway. Se destinos da mesma sub-rede funcionam e os remotos não, a saída da rede é o foco.',
          },
          {
            title: 'Handshake não conclui',
            text: 'Já há caminho IP, mas uma porta, um firewall ou o serviço podem estar impedindo a conexão.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'atencao',
        title: 'Sintoma não é causa',
        text: '"Internet caiu" costuma ser o relato de um efeito. A investigação precisa transformar o relato em um comportamento observável: qual destino, qual porta, qual horário, qual mensagem de erro.',
      },
    ],
    exercises: [
      {
        id: 'A1-E1',
        kind: 'mcq',
        objective: 'Associar uma responsabilidade concreta à camada correta.',
        difficulty: 'iniciante',
        prompt:
          'Um navegador inicia uma conexão com `10.10.50.20:443`. Qual camada é responsável por identificar a porta de destino?',
        hints: [
          'Portas são usadas para multiplexar conversas entre aplicações.',
          'Pense na diferença entre endereço de host e endereço de processo.',
        ],
        choices: [
          {
            id: 'a',
            label: 'Enlace, porque o quadro Ethernet carrega a porta.',
            rationale: 'O cabeçalho Ethernet carrega MACs e EtherType, não portas TCP ou UDP.',
          },
          {
            id: 'b',
            label: 'Rede, porque o endereço IP contém a porta.',
            rationale: 'O cabeçalho IPv4 não contém portas de transporte. Ele contém endereços e protocolo.',
          },
          {
            id: 'c',
            label: 'Transporte, porque TCP e UDP usam portas de origem e destino.',
            rationale: 'Correto. As portas pertencem ao cabeçalho de transporte e identificam processos.',
          },
          {
            id: 'd',
            label: 'Aplicação, porque o navegador escolhe a porta 443.',
            rationale: 'A aplicação usa a porta, mas a identificação no cabeçalho é responsabilidade do transporte.',
          },
        ],
        answerId: 'c',
        explanation:
          'TCP e UDP incluem portas de origem e destino. O IP entrega o pacote ao host correto; a camada de transporte direciona os dados ao processo correto.',
      },
      {
        id: 'A1-E2',
        kind: 'order',
        objective: 'Reconstruir o encapsulamento de uma requisição.',
        difficulty: 'iniciante',
        prompt:
          'Ordene os passos de encapsulamento no emissor, do primeiro ao último, para uma requisição HTTP sobre TLS.',
        hints: [
          'A aplicação produz o conteúdo antes de qualquer cabeçalho de transporte.',
          'O quadro Ethernet é o último envelope criado antes da transmissão no enlace.',
        ],
        items: [
          { id: 'frame', label: 'Quadro Ethernet com MAC de origem e destino' },
          { id: 'http', label: 'Mensagem HTTP produzida pela aplicação' },
          { id: 'ip', label: 'Pacote IP com endereços lógicos' },
          { id: 'tcp', label: 'Segmento TCP com portas e controle de entrega' },
          { id: 'bits', label: 'Sinais elétricos ou ópticos no meio físico' },
        ],
        correctOrder: ['http', 'tcp', 'ip', 'frame', 'bits'],
        explanation:
          'A aplicação produz os dados; o transporte adiciona portas; a rede adiciona IP; o enlace monta o quadro; a camada física transmite os bits. O receptor percorre o caminho inverso.',
      },
      {
        id: 'A1-E3',
        kind: 'short',
        objective: 'Explicar o papel do MAC do gateway em uma comunicação remota.',
        difficulty: 'intermediario',
        prompt:
          'Uma estação envia um pacote para um servidor em outra sub-rede. No quadro Ethernet criado pela estação, qual endereço MAC aparece como destino?',
        placeholder: 'Responda em poucas palavras.',
        accepted: [
          'gateway',
          'mac do gateway',
          'o mac do gateway',
          'do gateway',
          'gateway padrao',
          'o mac do gateway padrao',
          'mac do roteador',
          'o mac do roteador',
          'mac do gateway padrao',
        ],
        sampleAnswer: 'O MAC do gateway padrão.',
        hints: [
          'O destino IP continua sendo o servidor final.',
          'Para sair da sub-rede local, o quadro precisa ser entregue a um vizinho que saiba rotear.',
        ],
        explanation:
          'O endereço IP de destino permanece o do servidor, mas o quadro Ethernet é endereçado ao MAC do gateway. O roteador recebe o quadro, remove o envelope de enlace e encaminha o pacote para o próximo salto.',
      },
    ],
    takeaways: [
      'Modelos ajudam a localizar onde um comportamento falha.',
      'Encapsulamento adiciona cabeçalhos por camada; desencapsulamento os remove.',
      'O MAC muda a cada salto; o IP de destino permanece o mesmo.',
      'Um teste inicial adequado produz evidência que separa hipóteses.',
    ],
  },
  {
    id: 'ipv4-cidr',
    trackId: 'redes',
    moduleId: 'redes-fundamentos',
    order: 2,
    title: 'IPv4, máscaras e CIDR sem decoreba',
    eyebrow: 'Endereçamento como decisão',
    summary:
      'Calcule rede, broadcast e faixa utilizável entendendo o que a máscara faz. Reconheça endereços privados e planeje sub-redes com justificativa.',
    minutes: 18,
    difficulty: 'iniciante',
    competency: 'redes',
    objectives: [
      'Converter prefixo CIDR e máscara e localizar os limites de uma sub-rede.',
      'Calcular hosts utilizáveis sem confundir rede e broadcast.',
      'Reconhecer faixas privadas e justificar uma divisão de sub-rede.',
    ],
    prerequisites: ['O caminho de um pacote (recomendado).'],
    blocks: [
      {
        kind: 'paragraph',
        text: 'Um endereço IPv4 tem 32 bits. A máscara separa a parte que identifica a **rede** da parte que identifica o **host**. Em vez de escrever `255.255.255.0`, usamos o prefixo `/24`: os primeiros 24 bits são de rede e os 8 restantes ficam para hosts.',
      },
      {
        kind: 'code',
        label: 'Exemplo: mesma rede, host diferente',
        code: `Rede:       10.30.4.0/24
Máscara:    255.255.255.0
Host:       10.30.4.23
Gateway:    10.30.4.1
Broadcast:  10.30.4.255

Faixa de hosts: 10.30.4.1 – 10.30.4.254
Hosts utilizáveis: 2^(32-24) - 2 = 254`,
      },
      {
        kind: 'heading',
        text: 'Rede e broadcast não são hosts',
      },
      {
        kind: 'paragraph',
        text: 'O endereço com todos os bits de host em zero representa a rede. Com todos em um, representa o broadcast daquela sub-rede. Nenhum dos dois pode ser atribuído a uma interface. Uma `10.30.4.0/24` não pode ter um host `.0`; `10.30.4.255` não pode ser endereçado a uma estação.',
      },
      {
        kind: 'table',
        caption: 'Atalhos de prefixo que aparecem em diagnósticos',
        headers: ['CIDR', 'Máscara', 'Bloco', 'Hosts utilizáveis'],
        rows: [
          ['/24', '255.255.255.0', '256', '254'],
          ['/25', '255.255.255.128', '128', '126'],
          ['/26', '255.255.255.192', '64', '62'],
          ['/27', '255.255.255.224', '32', '30'],
          ['/30', '255.255.255.252', '4', '2'],
        ],
      },
      {
        kind: 'callout',
        tone: 'nota',
        title: 'Endereços privados não são "internet falsa"',
        text: '10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16 são faixas reservadas para uso interno. Elas exigem tradução (NAT) ou roteamento controlado para alcançar a Internet pública. A presença de um IP privado em um log não indica, por si só, origem maliciosa.',
      },
      {
        kind: 'heading',
        text: 'Dividir uma rede é responder a uma necessidade',
      },
      {
        kind: 'paragraph',
        text: 'Se uma rede `/24` precisa ser dividida em quatro partes iguais, usamos dois bits adicionais de rede: `24 + 2 = /26`. Cada parte tem 64 endereços (62 hosts). Em um diagnóstico, máscaras inconsistentes entre vizinhos produzem sintomas curiosos: alguns hosts conversam, outros não, dependendo do cálculo de rede de cada estação.',
      },
      {
        kind: 'callout',
        tone: 'atencao',
        title: 'Um gateway fora da sub-rede não é alcançável',
        text: 'Se o host está em `10.30.4.23/24` e o gateway configurado é `10.30.5.1`, o host tenta alcançar o gateway via ARP na rede local e não encontra resposta. A configuração parece preenchida, mas é logicamente inválida.',
      },
    ],
    exercises: [
      {
        id: 'A2-E1',
        kind: 'subnet',
        seed: 20260914,
        objective: 'Calcular os limites de uma sub-rede a partir de um host e um prefixo.',
        difficulty: 'intermediario',
        prompt:
          'Considere o host indicado. Calcule o endereço de rede, o broadcast, a faixa utilizável e a quantidade de hosts utilizáveis.',
        hints: [
          'Converta o prefixo em máscara e faça a operação AND bit a bit entre IP e máscara para obter a rede.',
          'O primeiro host utilizável é a rede + 1; o último é o broadcast - 1.',
          'A quantidade de hosts utilizáveis é 2^(32 - prefixo) - 2.',
        ],
        explanation:
          'A máscara determina quantos bits identificam rede e quantos identificam host. O endereço de rede tem bits de host em zero; o broadcast tem bits de host em um. Ambos são excluídos da faixa de interfaces.',
      },
      {
        id: 'A2-E2',
        kind: 'mcq',
        objective: 'Reconhecer intervalos privados definidos para IPv4.',
        difficulty: 'iniciante',
        prompt:
          'Qual conjunto contém apenas faixas IPv4 reservadas para endereçamento privado?',
        hints: [
          'A faixa 192.168.0.0/16 é frequentemente usada em redes domésticas.',
          '172.16.0.0/12 cobre de 172.16.0.0 até 172.31.255.255. Não é apenas 172.16.0.0/16.',
        ],
        choices: [
          {
            id: 'a',
            label: '10.0.0.0/8 e 192.168.0.0/16 apenas.',
            rationale: 'Estão corretas, mas a resposta está incompleta: 172.16.0.0/12 também é privada.',
          },
          {
            id: 'b',
            label: '10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16.',
            rationale: 'Correto. São os três blocos definidos para endereçamento privado IPv4.',
          },
          {
            id: 'c',
            label: '10.0.0.0/8, 169.254.0.0/16 e 224.0.0.0/4.',
            rationale: '169.254.0.0/16 é link-local e 224.0.0.0/4 é multicast; nenhum é o bloco privado clássico.',
          },
          {
            id: 'd',
            label: '127.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16.',
            rationale: '127.0.0.0/8 é loopback, não uma faixa privada roteável para redes internas.',
          },
        ],
        answerId: 'b',
        explanation:
          'As três faixas privadas IPv4 são 10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16. Elas não devem ser roteadas na Internet pública.',
      },
      {
        id: 'A2-E3',
        kind: 'short',
        objective: 'Relacionar número de sub-redes ao novo prefixo.',
        difficulty: 'intermediario',
        prompt:
          'Uma equipe precisa dividir 192.168.10.0/24 em quatro sub-redes de tamanhos iguais. Qual novo prefixo deve ser usado? Responda no formato /NN.',
        placeholder: '/NN',
        accepted: ['/26', '26'],
        sampleAnswer: '/26',
        hints: [
          'Quatro sub-redes exigem dois bits adicionais de rede, porque 2² = 4.',
          'Some os bits adicionais ao prefixo original.',
        ],
        explanation:
          'Quatro sub-redes exigem 2 bits adicionais: /24 + 2 = /26. Cada sub-rede fica com 64 endereços e 62 hosts utilizáveis.',
      },
    ],
    takeaways: [
      'A máscara separa rede e host; o prefixo é sua forma compacta.',
      'Rede e broadcast não são endereços de interface.',
      'Dividir sub-redes altera o prefixo e redefine o alcance local.',
      'Máscara ou gateway incoerentes produzem falhas seletivas.',
    ],
  },
  {
    id: 'arp-gateway-rota',
    trackId: 'redes',
    moduleId: 'redes-fundamentos',
    order: 3,
    title: 'ARP, gateway e o trajeto até o destino',
    eyebrow: 'Da sub-rede local ao próximo salto',
    summary:
      'Entenda como uma estação decide se o destino é local, como encontra um MAC e como o TTL aparece no traceroute. Aprenda a ler sintomas de gateway e rota.',
    minutes: 16,
    difficulty: 'intermediario',
    competency: 'diagnostico',
    objectives: [
      'Explicar a decisão local versus remota usando máscara e gateway.',
      'Interpretar ARP, ICMP e TTL em testes de conectividade.',
      'Distinguir falha de gateway, ausência de rota e serviço indisponível.',
    ],
    prerequisites: ['IPv4, máscaras e CIDR sem decoreba.'],
    blocks: [
      {
        kind: 'paragraph',
        text: 'Antes de enviar, a estação compara o destino com sua própria sub-rede. Se o destino é local, ela procura o MAC do destino com ARP. Se é remoto, procura o MAC do **gateway**. O endereço IP de destino não muda; o endereço físico do próximo salto muda.',
      },
      {
        kind: 'steps',
        title: 'Decisão de envio em quatro perguntas',
        steps: [
          {
            title: 'O destino está na minha sub-rede?',
            text: 'A estação aplica a própria máscara aos dois endereços. O resultado é comparado.',
          },
          {
            title: 'Qual MAC devo usar?',
            text: 'Destino local: ARP para o IP de destino. Destino remoto: ARP para o gateway.',
          },
          {
            title: 'O gateway responde?',
            text: 'Um ping ao gateway testa a vizinhança local e a coerência da VLAN. Não testa a rota até o servidor final.',
          },
          {
            title: 'Há rota para a rede de destino?',
            text: 'O roteador precisa de interface conectada ou rota aprendida/configurada. Sem rota, o pacote é descartado mesmo que o gateway responda.',
          },
        ],
      },
      {
        kind: 'code',
        label: 'Três testes que separam hipóteses',
        code: `ping 10.30.4.1        # gateway local
ping 10.10.50.20      # destino IP final
nslookup portal.universidade.local

# Interpretação:
# gateway falha + IP local falha  -> enlace, VLAN, máscara ou host
# gateway ok + IP remoto falha   -> rota, firewall ou destino
# IP remoto ok + nome falha      -> DNS
# nome ok + porta falha          -> serviço, firewall ou TLS`,
      },
      {
        kind: 'heading',
        text: 'ICMP e TTL: o que o traceroute realmente faz',
      },
      {
        kind: 'paragraph',
        text: 'O TTL (time to live) é um contador decrementado por cada roteador. Quando chega a zero, o roteador descarta o pacote e devolve uma mensagem ICMP de tempo excedido. O traceroute explora esse comportamento, enviando sondas com TTL crescente, para descobrir os saltos do caminho.',
      },
      {
        kind: 'callout',
        tone: 'limite',
        title: 'Traceroute não prova bloqueio de firewall',
        text: 'Roteadores podem não responder às sondas, e regras podem filtrar ICMP sem bloquear a aplicação. Um salto ausente é uma lacuna de visibilidade, não automaticamente um bloqueio. Correlacione com portas e logs.',
      },
      {
        kind: 'heading',
        text: 'Sintomas que parecem iguais',
      },
      {
        kind: 'table',
        headers: ['Observação', 'Hipótese inicial', 'Teste que diferencia'],
        rows: [
          ['Ping ao gateway falha', 'Enlace, VLAN ou máscara', 'arp -a, estado da porta, vizinhos'],
          ['Gateway responde, destino não', 'Rota, firewall ou host final', 'ping ao IP final, traceroute, ACL'],
          ['IP final responde, nome não', 'DNS ou zona', 'nslookup, configuração de DNS'],
          ['Nome resolve, HTTPS não', 'Porta, serviço ou TLS', 'teste de porta, logs do servidor'],
        ],
      },
      {
        kind: 'callout',
        tone: 'atencao',
        title: 'Um gateway correto pode não ser o gateway certo',
        text: 'Se a estação está na VLAN 30 e o endereço do gateway pertence à VLAN 10, o valor pode estar "preenchido" e ainda assim ser inalcançável. Configuração sintaticamente válida não é o mesmo que topologia coerente.',
      },
    ],
    exercises: [
      {
        id: 'A3-E1',
        kind: 'mcq',
        objective: 'Escolher o próximo teste a partir de um conjunto de sintomas.',
        difficulty: 'intermediario',
        prompt:
          'Uma estação acessa `10.10.50.20` por IP, mas o navegador falha ao abrir `portal.universidade.local`. O gateway e o endereço IP final respondem. Qual é o próximo teste mais informativo?',
        context: 'Sintoma relatado no Laboratório 2. A estação tem IP e gateway coerentes com a VLAN.',
        hints: [
          'A conectividade IP já foi demonstrada.',
          'O navegador depende de um serviço adicional antes de abrir a conexão TCP.',
        ],
        choices: [
          {
            id: 'a',
            label: 'Trocar o cabo da estação e repetir o teste.',
            rationale: 'O link já transporta tráfego para o gateway e para o servidor. Trocar o cabo não investiga a diferença entre IP e nome.',
          },
          {
            id: 'b',
            label: 'Consultar o nome com nslookup e verificar o resolvedor configurado.',
            rationale: 'Correto. O próximo elo entre "IP funciona" e "nome falha" é a resolução de nomes.',
          },
          {
            id: 'c',
            label: 'Reinstalar o servidor web.',
            rationale: 'O servidor responde por IP e não há evidência de falha do serviço. A ação seria desproporcional e destrutiva.',
          },
          {
            id: 'd',
            label: 'Executar traceroute para o gateway.',
            rationale: 'O gateway já responde. O traceroute pode acrescentar contexto, mas não separa a hipótese de DNS.',
          },
        ],
        answerId: 'b',
        explanation:
          'O teste separa conectividade IP de resolução de nomes. Se nslookup falhar, a hipótese de DNS ganha sustentação; se resolver, o problema está mais adiante, na conexão ou na aplicação.',
      },
      {
        id: 'A3-E2',
        kind: 'order',
        objective: 'Sequenciar decisões de encaminhamento de um pacote remoto.',
        difficulty: 'intermediario',
        prompt:
          'Ordene o que acontece quando uma estação em `10.30.4.23/24` envia um pacote para `10.10.50.20`, assumindo rede funcional.',
        hints: [
          'A estação só entrega o quadro a um vizinho local.',
          'O roteador precisa encaminhar com base na rede de destino, não no MAC original.',
        ],
        items: [
          { id: 'arp', label: 'Estação consulta o MAC do gateway com ARP' },
          { id: 'frame', label: 'Estação envia quadro ao MAC do gateway' },
          { id: 'route', label: 'Roteador consulta a rota para 10.10.50.0/24' },
          { id: 'newframe', label: 'Roteador cria um novo quadro para o servidor' },
          { id: 'reply', label: 'Servidor responde ao IP de origem do pacote' },
        ],
        correctOrder: ['arp', 'frame', 'route', 'newframe', 'reply'],
        explanation:
          'O destino é remoto, então a estação usa o gateway como próximo salto. Cada roteador remove o enlace anterior e cria um novo quadro. O IP de origem e destino permanece no pacote de ponta a ponta.',
      },
      {
        id: 'A3-E3',
        kind: 'multi',
        objective: 'Separar o que o TTL e o traceroute demonstram do que não demonstram.',
        difficulty: 'avancado',
        prompt: 'Selecione todas as afirmações corretas sobre TTL, ICMP e traceroute.',
        hints: [
          'TTL é um limite de vida, não uma medida de segurança criptográfica.',
          'A ausência de resposta de um salto pode ter várias causas.',
        ],
        choices: [
          {
            id: 'a',
            label: 'O TTL diminui a cada roteador que processa o pacote.',
            rationale: 'Correto. Quando chega a zero, o pacote é descartado e pode ser gerado um ICMP de tempo excedido.',
          },
          {
            id: 'b',
            label: 'O traceroute usa TTL crescente para descobrir saltos.',
            rationale: 'Correto. Cada valor de TTL provoca a resposta de um ponto sucessivo do caminho.',
          },
          {
            id: 'c',
            label: 'Um salto que não responde comprova uma regra de firewall.',
            rationale: 'Incorreto. Pode ser ICMP filtrado, roteador silencioso, política de rede ou outra causa.',
          },
          {
            id: 'd',
            label: 'TTL alto garante que o pacote chegou ao destino.',
            rationale: 'Incorreto. TTL apenas limita o número de saltos; não confirma entrega.',
          },
          {
            id: 'e',
            label: 'Traceroute pode mostrar um caminho diferente do usado por outro protocolo ou sentido do fluxo.',
            rationale: 'Correto. Rotas podem variar por destino, origem, protocolo e balanceamento.',
          },
        ],
        correctIds: ['a', 'b', 'e'],
        explanation:
          'TTL e traceroute revelam parte do caminho e limitações de encaminhamento. Não substituem teste de porta, análise de firewall ou logs do serviço.',
      },
    ],
    takeaways: [
      'A máscara decide se o destino é local; o gateway é o próximo salto para o restante.',
      'ARP resolve um endereço IP para MAC apenas no enlace local.',
      'Um teste ao gateway não valida a rota inteira.',
      'Traceroute e ICMP oferecem indícios, não provas de bloqueio.',
    ],
  },
  {
    id: 'tcp-udp-dns-dhcp',
    trackId: 'redes',
    moduleId: 'redes-fundamentos',
    order: 4,
    title: 'TCP, UDP, DNS e DHCP',
    eyebrow: 'Serviços que costumam falhar antes do site',
    summary:
      'Acompanhe handshake, portas e os dois serviços que entregam endereço e nome a uma estação. Reconheça sintomas de falha de DNS e DHCP.',
    minutes: 17,
    difficulty: 'intermediario',
    competency: 'redes',
    objectives: [
      'Diferenciar TCP e UDP por comportamento e uso.',
      'Descrever o handshake TCP e o efeito de uma conexão incompleta.',
      'Explicar o processo DORA e a dependência entre DHCP, DNS e acesso a serviços.',
    ],
    prerequisites: ['ARP, gateway e o trajeto até o destino.'],
    blocks: [
      {
        kind: 'paragraph',
        text: 'TCP estabelece uma sessão antes de trocar dados. O handshake de três vias confirma que ambos os lados estão presentes e preparados para a conversa. UDP não estabelece sessão; envia datagramas e deixa para a aplicação a decisão de repetir ou não.',
      },
      {
        kind: 'figure',
        figure: 'handshake',
        caption:
          'SYN, SYN/ACK e ACK. Se a terceira etapa não ocorre, o cliente não considera a conexão estabelecida.',
      },
      {
        kind: 'table',
        headers: ['Característica', 'TCP', 'UDP'],
        rows: [
          ['Conexão', 'Handshake de três vias', 'Sem conexão'],
          ['Entrega', 'Confirmações, retransmissão e ordem', 'Sem garantia nativa'],
          ['Uso típico', 'HTTP/HTTPS, SSH, transferência de arquivos', 'DNS (consultas comuns), DHCP, VoIP, jogos'],
          ['Sintoma de bloqueio', 'SYN sem SYN/ACK, timeout', 'Silêncio ou resposta de outro serviço'],
        ],
      },
      {
        kind: 'heading',
        text: 'DNS: transformar nome em endereço',
      },
      {
        kind: 'paragraph',
        text: 'O cliente consulta o resolvedor configurado. Se o resolvedor conhece a zona, responde com o registro; se não, pode encaminhar a consulta. `NXDOMAIN` significa que o nome não existe para aquele resolvedor. Um resolvedor externo não conhece, por padrão, zonas internas como `universidade.local`.',
      },
      {
        kind: 'figure',
        figure: 'dns-flow',
        caption:
          'Um nome interno deve ser resolvido pelo resolvedor que conhece a zona interna. Trocar o DNS do cliente por um resolvedor externo pode quebrar apenas nomes internos.',
      },
      {
        kind: 'heading',
        text: 'DHCP: a configuração que chega pronta',
      },
      {
        kind: 'steps',
        title: 'DORA, em quatro mensagens',
        steps: [
          { title: 'Discover', text: 'O cliente procura um servidor DHCP na rede local.' },
          { title: 'Offer', text: 'O servidor oferece endereço, máscara, gateway, DNS e tempo de lease.' },
          { title: 'Request', text: 'O cliente solicita formalmente a oferta escolhida.' },
          { title: 'Acknowledge', text: 'O servidor confirma a concessão. O cliente aplica os parâmetros.' },
        ],
      },
      {
        kind: 'callout',
        tone: 'atencao',
        title: 'O DHCP pode entregar um problema em cada opção',
        text: 'Um lease pode conter IP válido, máscara correta e DNS inadequado. Não basta ver "conectado": é preciso conferir o que foi entregue. O valor de DNS em um lease é uma evidência de configuração, não uma opinião do usuário.',
      },
      {
        kind: 'callout',
        tone: 'nota',
        title: 'Portas ajudam a localizar o elo',
        text: 'DNS usa 53; DHCP usa 67/68; HTTPS usa 443. A porta é uma pista, não uma conclusão: um firewall pode permitir 443 e o serviço ainda estar indisponível.',
      },
    ],
    exercises: [
      {
        id: 'A4-E1',
        kind: 'order',
        objective: 'Reconstruir a concessão DHCP.',
        difficulty: 'iniciante',
        prompt: 'Ordene as mensagens do processo DHCP até o cliente aplicar a configuração.',
        hints: [
          'O cliente anuncia que procura um servidor antes de receber qualquer oferta.',
          'A confirmação final do servidor é necessária antes de o cliente usar o lease.',
        ],
        items: [
          { id: 'offer', label: 'Offer — servidor oferece parâmetros' },
          { id: 'discover', label: 'Discover — cliente procura servidor' },
          { id: 'ack', label: 'Acknowledge — servidor confirma a concessão' },
          { id: 'request', label: 'Request — cliente solicita a oferta escolhida' },
        ],
        correctOrder: ['discover', 'offer', 'request', 'ack'],
        explanation:
          'DORA: Discover, Offer, Request, Acknowledge. As opções entregues no ACK passam a valer para o cliente, incluindo gateway e DNS.',
      },
      {
        id: 'A4-E2',
        kind: 'mcq',
        objective: 'Relacionar aplicação, transporte e porta.',
        difficulty: 'iniciante',
        prompt:
          'Um cliente abre `https://portal.universidade.local`. Depois de resolver o nome, qual combinação de transporte e porta o navegador usa por padrão?',
        hints: [
          'HTTPS é HTTP protegido por TLS. O transporte precisa garantir entrega e ordem.',
          'A porta padrão do HTTPS não é a mesma do DNS.',
        ],
        choices: [
          { id: 'a', label: 'UDP, porta 53.', rationale: 'Porta 53 é DNS. O navegador já resolveu o nome antes de abrir a conexão.' },
          { id: 'b', label: 'TCP, porta 443.', rationale: 'Correto. HTTPS usa TCP por padrão na porta 443; o TLS ocorre sobre essa conexão.' },
          { id: 'c', label: 'UDP, porta 443.', rationale: 'HTTPS pode usar QUIC/HTTP3 em UDP/443 em alguns contextos, mas o padrão clássico e o handshake TCP descrito aqui usam TCP. A alternativa não representa o caso base.' },
          { id: 'd', label: 'TCP, porta 53.', rationale: 'Porta 53 é associada a DNS, não ao portal HTTPS.' },
        ],
        answerId: 'b',
        explanation:
          'No modelo clássico, HTTPS usa TCP/443. QUIC pode transportar HTTP/3 em UDP/443, mas a questão pede o comportamento padrão e o handshake TCP estudado. O importante é associar a escolha ao contexto observado.',
      },
      {
        id: 'A4-E3',
        kind: 'multi',
        objective: 'Reconhecer um conjunto coerente de sintomas de DNS.',
        difficulty: 'intermediario',
        prompt:
          'Uma estação recebeu `8.8.8.8` como DNS, mas precisa acessar um portal cujo nome só existe na zona interna. Quais observações são compatíveis com esse cenário?',
        context: 'O IP do portal responde quando testado diretamente.',
        hints: [
          'O resolvedor externo não tem autoridade sobre a zona interna.',
          'A ausência de conexão TCP pode ser consequência de não resolver o nome.',
        ],
        choices: [
          { id: 'a', label: 'O nome interno retorna NXDOMAIN.', rationale: 'Correto. O resolvedor externo não conhece a zona interna.' },
          { id: 'b', label: 'O ping ao IP do portal responde.', rationale: 'Correto. A conectividade IP pode estar íntegra enquanto a resolução falha.' },
          { id: 'c', label: 'Nenhum pacote TCP/443 é enviado ao portal.', rationale: 'Correto. Sem endereço resolvido, o navegador não inicia a conexão.' },
          { id: 'd', label: 'O servidor web está necessariamente fora do ar.', rationale: 'Incorreto. O ping ao IP responde e não há evidência de falha do serviço.' },
          { id: 'e', label: 'O gateway está necessariamente ausente.', rationale: 'Incorreto. O acesso ao resolvedor externo e ao IP do portal pode ocorrer com gateway funcional.' },
        ],
        correctIds: ['a', 'b', 'c'],
        explanation:
          'O padrão é típico de DNS inadequado para a zona: nome não resolve, IP funciona e não há tentativa de conexão à aplicação. A conclusão exige verificar o resolvedor, não apenas o servidor.',
      },
    ],
    takeaways: [
      'TCP estabelece sessão; UDP não oferece garantias nativas de entrega.',
      'Um nome interno depende de um resolvedor que conheça essa zona.',
      'DHCP entrega um conjunto de parâmetros, não apenas um IP.',
      'A ausência de tráfego HTTPS pode ser consequência de falha anterior, no DNS.',
    ],
  },
  {
    id: 'vlans-firewall-tls',
    trackId: 'redes',
    moduleId: 'redes-fundamentos',
    order: 5,
    title: 'VLANs, firewall e TLS',
    eyebrow: 'Segmentar, permitir e verificar',
    summary:
      'Entenda segmentação como controle, leia regras de firewall sem decorar sintaxe e reconheça o que um certificado prova em uma conexão TLS.',
    minutes: 15,
    difficulty: 'intermediario',
    competency: 'seguranca',
    objectives: [
      'Explicar por que dois hosts na mesma sub-rede podem não se comunicar em VLANs diferentes.',
      'Distinguir regra de firewall, rota e serviço indisponível.',
      'Interpretar o papel do certificado em TLS sem confundi-lo com prova de intenção.',
    ],
    prerequisites: ['TCP, UDP, DNS e DHCP.'],
    blocks: [
      {
        kind: 'paragraph',
        text: 'Uma VLAN separa domínios de broadcast no switch. Dois computadores conectados ao mesmo equipamento, com endereços da mesma sub-rede, mas em VLANs diferentes, não se enxergam na camada 2. Para cruzar a fronteira, é necessário roteamento e uma política de acesso explícita.',
      },
      {
        kind: 'table',
        headers: ['Fronteira', 'O que controla', 'Sintoma de bloqueio'],
        rows: [
          ['VLAN', 'Domínio de broadcast e portas de acesso', 'Vizinho local inalcançável; gateway pode estar em outra VLAN'],
          ['Rota', 'Encaminhamento entre redes', 'Gateway responde, destino remoto não'],
          ['Firewall / ACL', 'Permissão por endereço, protocolo e porta', 'Handshake não avança ou conexão é rejeitada'],
          ['Serviço', 'Disponibilidade na aplicação', 'Porta aceita, mas resposta de erro ou timeout de aplicação'],
        ],
      },
      {
        kind: 'code',
        label: 'Leitura de uma regra (exemplo didático)',
        code: `permit tcp 10.30.4.0/24 host 10.10.50.20 eq 443
# Origem: rede do Laboratório 2
# Destino: portal na DMZ
# Protocolo: TCP
# Porta de destino: 443
# O que ainda não sabemos: se o servidor está no ar,
# se o DNS resolve o nome e se o retorno está liberado.

deny ip any any log
# Regra final: nega o que não foi permitido e registra.
# A ordem importa: a primeira regra compatível vence.`,
      },
      {
        kind: 'heading',
        text: 'TLS não é "cadeado mágico"',
      },
      {
        kind: 'paragraph',
        text: 'TLS combina criptografia, integridade e autenticação do servidor por certificado. O certificado é emitido por uma autoridade certificadora e vincula uma chave pública a um nome. Ele ajuda a confirmar que o cliente está falando com o servidor esperado, mas não prova que o conteúdo é verdadeiro, que o servidor é confiável em todos os sentidos ou que não há comprometimento.',
      },
      {
        kind: 'callout',
        tone: 'limite',
        title: 'HTTPS não apaga a necessidade de análise',
        text: 'Tráfego HTTPS protege o conteúdo contra observadores no caminho. Metadados como SNI, horários, volumes e endereços IP ainda podem ser analisados. Criptografia forte não impede um servidor legítimo de estar mal configurado nem um endpoint de estar comprometido.',
      },
      {
        kind: 'callout',
        tone: 'nota',
        title: 'Defesa em profundidade',
        text: 'Segmentar, aplicar menor privilégio, registrar eventos e monitorar não são alternativas entre si. Cada controle reduz uma classe de risco e cria evidências para as demais camadas.',
      },
    ],
    exercises: [
      {
        id: 'A5-E1',
        kind: 'mcq',
        objective: 'Relacionar VLAN e comunicação entre hosts.',
        difficulty: 'iniciante',
        prompt:
          'Dois hosts estão no mesmo switch e na mesma sub-rede IPv4, mas em VLANs diferentes e sem roteamento entre elas. O que acontece?',
        hints: [
          'Uma VLAN define um domínio de broadcast separado.',
          'O switch de acesso não encaminha tráfego entre VLANs sem uma função de camada 3.',
        ],
        choices: [
          { id: 'a', label: 'Comunicam-se normalmente, porque o switch encaminha por MAC.', rationale: 'O switch respeita a VLAN; MACs em VLANs distintas não fazem parte do mesmo domínio de encaminhamento.' },
          { id: 'b', label: 'Não se comunicam enquanto não houver roteamento entre as VLANs e política compatível.', rationale: 'Correto. A segmentação precisa de uma decisão explícita de camada 3 para permitir o tráfego.' },
          { id: 'c', label: 'Comunicam-se apenas por UDP.', rationale: 'A VLAN não distingue TCP de UDP dessa forma.' },
          { id: 'd', label: 'O switch converte automaticamente a VLAN ao detectar o mesmo prefixo.', rationale: 'Não existe essa conversão automática segura; a topologia precisa ser configurada.' },
        ],
        answerId: 'b',
        explanation:
          'VLANs separam o domínio de camada 2. Mesmo com endereços na mesma faixa, hosts em VLANs diferentes dependem de roteamento e de regras de acesso.',
      },
      {
        id: 'A5-E2',
        kind: 'multi',
        objective: 'Selecionar controles coerentes com defesa em profundidade.',
        difficulty: 'intermediario',
        prompt:
          'Quais medidas reduzem de forma coerente o risco de movimentação lateral em uma rede corporativa?',
        hints: [
          'Movimentação lateral explora caminhos permitidos demais.',
          'Controles isolados podem ser contornados; procure combinações.',
        ],
        choices: [
          { id: 'a', label: 'Segmentar serviços e limitar tráfego entre VLANs por necessidade.', rationale: 'Correto. Reduz caminhos não necessários e cria fronteiras observáveis.' },
          { id: 'b', label: 'Aplicar menor privilégio a contas e serviços.', rationale: 'Correto. Limita o alcance de credenciais comprometidas.' },
          { id: 'c', label: 'Registrar autenticações e conexões entre segmentos.', rationale: 'Correto. Aumenta a visibilidade para detectar e reconstruir movimentação.' },
          { id: 'd', label: 'Manter uma VLAN única para simplificar a operação.', rationale: 'Incorreto. Uma rede plana amplia o alcance e reduz a capacidade de contenção.' },
          { id: 'e', label: 'Desativar atualizações para evitar mudanças.', rationale: 'Incorreto. Atraso de atualização amplia superfície de ataque e não contém movimento lateral.' },
        ],
        correctIds: ['a', 'b', 'c'],
        explanation:
          'Segmentação, menor privilégio e observabilidade se complementam. Nenhum deles, isoladamente, garante contenção, mas juntos reduzem caminhos e produzem evidências.',
      },
    ],
    takeaways: [
      'VLAN separa domínio de broadcast; cruzar VLAN exige decisão de camada 3.',
      'Regras de firewall devem ser lidas com origem, destino, protocolo, porta e ordem.',
      'TLS protege e autentica o canal; não valida a intenção do servidor.',
      'Defesa em profundidade combina controles e evidências.',
    ],
  },
  {
    id: 'metodo-troubleshooting',
    trackId: 'administracao',
    moduleId: 'admin-campo',
    order: 1,
    title: 'Um método para não trocar tudo de uma vez',
    eyebrow: 'Troubleshooting com rastro',
    summary:
      'Transforme sintomas em hipóteses testáveis, escolha testes que separem causas e registre cada alteração. Uma sequência simples para falhas de rede.',
    minutes: 16,
    difficulty: 'intermediario',
    competency: 'diagnostico',
    objectives: [
      'Converter um relato vago em comportamento observável e escopo.',
      'Ordenar testes do mais local ao mais específico sem confundir causa e coincidência.',
      'Registrar hipótese, teste, resultado e mudança de forma reproduzível.',
    ],
    prerequisites: ['Fundamentos de redes (recomendado).'],
    blocks: [
      {
        kind: 'paragraph',
        text: 'Troubleshooting não é uma sequência de comandos afortunados. É um processo de redução de incerteza. Uma boa intervenção deixa um rastro: o que foi observado, o que foi testado, o que mudou e como o resultado foi verificado.',
      },
      {
        kind: 'figure',
        figure: 'triage',
        caption:
          'Delimitar, observar, testar, alterar e verificar. Cada passo deve produzir uma evidência, não apenas uma sensação de progresso.',
      },
      {
        kind: 'steps',
        title: 'Roteiro mínimo',
        steps: [
          { title: 'Delimite o escopo', text: 'Quem, o quê, quando, de onde e qual destino. "Não funciona" não é escopo.' },
          { title: 'Estabeleça o sintoma observável', text: 'Mensagem de erro, tempo, destino, porta, resultado de um comando.' },
          { title: 'Liste hipóteses concorrentes', text: 'Enlace, endereçamento, gateway, DNS, firewall, serviço, autenticação. Priorize as mais prováveis e as mais baratas de testar.' },
          { title: 'Escolha testes discriminantes', text: 'Um teste útil produz resultados diferentes para hipóteses diferentes. Ping ao IP e nslookup separam conectividade de nome.' },
          { title: 'Altere um parâmetro por vez', text: 'Mudanças simultâneas impedem saber o que funcionou. Registre o estado anterior antes de agir.' },
          { title: 'Verifique e documente', text: 'Repita o teste original, observe efeitos colaterais e atualize a hipótese.' },
        ],
      },
      {
        kind: 'table',
        caption: 'Sintomas e primeiros testes',
        headers: ['Sintoma', 'Primeiro teste', 'O que ainda não sabemos'],
        rows: [
          ['Nenhum acesso local', 'Estado de link e IP', 'VLAN, gateway, DNS'],
          ['IP remoto responde, nome falha', 'nslookup', 'Porta, TLS, aplicação'],
          ['Só um host afetado', 'Comparar configurações e lease', 'Política central ou config local'],
          ['Só um serviço falha', 'Testar porta e logs', 'Rota, firewall, TLS, aplicação'],
          ['Intermitente', 'Horários, logs e testes repetidos', 'Conflito de IP, perda, roaming, capacidade'],
        ],
      },
      {
        kind: 'callout',
        tone: 'atencao',
        title: 'Não confunda reiniciar com diagnosticar',
        text: 'Reiniciar pode apagar o estado que explicaria a falha e transformar um incidente reproduzível em um mistério. Preserve logs e configuração antes de reiniciar. Em ambientes críticos, a ação precisa ser proporcional ao risco.',
      },
      {
        kind: 'callout',
        tone: 'nota',
        title: 'Uma hipótese pode ser correta e ainda assim não ser a causa',
        text: 'O fato de existir uma configuração incomum não prova que ela produziu o sintoma. O teste deve ligar configuração, comportamento e horário. Correlação ajuda; causalidade exige um encadeamento compatível.',
      },
    ],
    exercises: [
      {
        id: 'B1-E1',
        kind: 'order',
        objective: 'Ordenar um ciclo de diagnóstico defensável.',
        difficulty: 'intermediario',
        prompt:
          'Um usuário relata que "a internet caiu". Ordene as ações de uma abordagem que preserva evidências e reduz incerteza.',
        hints: [
          'Antes de alterar, torne o sintoma específico.',
          'Registrar o estado anterior é parte do teste, não burocracia.',
        ],
        items: [
          { id: 'scope', label: 'Delimitar host, destino, horário e mensagem de erro' },
          { id: 'hypotheses', label: 'Formular hipóteses concorrentes e testes discriminantes' },
          { id: 'test', label: 'Executar o teste escolhido e registrar o resultado' },
          { id: 'change', label: 'Alterar um único parâmetro, com estado anterior documentado' },
          { id: 'verify', label: 'Repetir o teste original e verificar efeitos colaterais' },
        ],
        correctOrder: ['scope', 'hypotheses', 'test', 'change', 'verify'],
        explanation:
          'O ciclo começa pela delimitação e termina com verificação e documentação. Mudar antes de observar destrói evidências e dificulta separar causa de coincidência.',
      },
      {
        id: 'B1-E2',
        kind: 'mcq',
        objective: 'Escolher a conduta que preserva causalidade.',
        difficulty: 'intermediario',
        prompt:
          'Durante um incidente, o gateway responde e o servidor remoto responde por IP. O nome interno não resolve. Qual conduta é mais adequada?',
        hints: [
          'O próximo elo ainda não testado é a resolução de nome.',
          'Mudanças amplas podem mascarar a causa.',
        ],
        choices: [
          { id: 'a', label: 'Reiniciar o switch e o servidor ao mesmo tempo.', rationale: 'Introduz duas mudanças e apaga estado, sem testar a hipótese de DNS.' },
          { id: 'b', label: 'Verificar o DNS configurado e consultar o nome em um resolvedor interno.', rationale: 'Correto. O teste foca o elo entre conectividade e nome e preserva o restante do ambiente.' },
          { id: 'c', label: 'Trocar o endereço IP do servidor.', rationale: 'O IP responde; alterar o servidor não investiga a diferença entre IP e nome.' },
          { id: 'd', label: 'Atualizar o firmware do roteador.', rationale: 'Ação de alto impacto e baixa relação com o sintoma observado neste ponto.' },
        ],
        answerId: 'b',
        explanation:
          'O teste discriminante é a resolução de nomes. Ele separa DNS de rota, firewall e serviço, sem introduzir mudanças desnecessárias.',
      },
    ],
    takeaways: [
      'Um sintoma específico vale mais que um relato vago.',
      'Testes devem separar hipóteses, não apenas produzir atividade.',
      'Altere um parâmetro por vez e registre o estado anterior.',
      'Verifique o resultado original e documente efeitos colaterais.',
    ],
  },
  {
    id: 'log-a-incidente',
    trackId: 'seguranca',
    moduleId: 'seguranca-deteccao',
    order: 1,
    title: 'Do log ao incidente',
    eyebrow: 'Correlação, IOCs e limites',
    summary:
      'Leia logs como eventos de um sistema, normalize horários, correlacione fontes e evite transformar um indicador isolado em conclusão de ataque.',
    minutes: 17,
    difficulty: 'avancado',
    competency: 'seguranca',
    objectives: [
      'Distinguir evento, indicador e conclusão.',
      'Correlacionar registros com fusos e formatos diferentes.',
      'Reconhecer limites de visibilidade, falsos positivos e hipóteses alternativas.',
    ],
    prerequisites: ['Fundamentos de redes e TCP/DNS (recomendado).'],
    blocks: [
      {
        kind: 'paragraph',
        text: 'Um log é uma representação parcial do que um sistema registrou. Antes de dizer o que aconteceu, é preciso entender o que aquele log vê, o que ele não vê e qual relógio ele usa. O mesmo evento pode aparecer em UTC em um firewall e em horário local no servidor.',
      },
      {
        kind: 'steps',
        title: 'Quatro operações antes de concluir',
        steps: [
          { title: 'Preserve e identifique', text: 'Registre origem, horário de coleta, método, responsável e hash do extrato. Não edite o original.' },
          { title: 'Normalize o tempo', text: 'Converta fusos e verifique se há relógios dessincronizados. Ordene eventos na mesma referência temporal.' },
          { title: 'Correlacione com critério', text: 'Use IP, porta, MAC, usuário, nome e janela temporal. Evite casar apenas um campo genérico.' },
          { title: 'Formule alternativas', text: 'Backup, atualização, teste autorizado, erro de configuração e comportamento legítimo podem produzir o mesmo padrão.' },
        ],
      },
      {
        kind: 'table',
        caption: 'Pistas e perguntas que faltam',
        headers: ['Observação', 'Indício possível', 'O que ainda falta'],
        rows: [
          ['NXDOMAIN repetido para domínio interno', 'Resolvedor inadequado ou zona ausente', 'Configuração entregue, consultas e outras fontes'],
          ['SYN sem SYN/ACK para muitos destinos', 'Varredura ou bloqueio de retorno', 'Origem autorizada? Logs de firewall? Janela?'],
          ['Aumento de volume para destino externo', 'Backup, atualização ou exfiltração', 'Payload, usuário, processo, periodicidade, autorização'],
          ['Login fora do horário habitual', 'Acesso indevido ou turno legítimo', 'MFA, dispositivo, geolocalização, correlação com ações'],
        ],
      },
      {
        kind: 'callout',
        tone: 'limite',
        title: 'Ausência de log não é ausência de evento',
        text: 'Falta de visibilidade pode ocorrer por filtros, retenção curta, coleta incompleta ou tráfego que não passa pelo sensor. "Não encontrei" deve ser registrado como limitação, não como prova de que nada aconteceu.',
      },
      {
        kind: 'callout',
        tone: 'atencao',
        title: 'IOC não é diagnóstico',
        text: 'Um indicador de comprometimento aponta para uma possibilidade. Antes de concluir, verifique contexto, falso positivo, origem do indicador e outras fontes. Um domínio estranho pode ser telemetria legítima; uma consulta NXDOMAIN pode ser erro de configuração.',
      },
    ],
    exercises: [
      {
        id: 'C1-E1',
        kind: 'mcq',
        objective: 'Distinguir indicador de conclusão.',
        difficulty: 'avancado',
        prompt:
          'Um host faz consultas repetidas a um resolvedor externo e recebe NXDOMAIN para o nome interno do portal. Qual afirmação é mais defensável antes de examinar outras fontes?',
        hints: [
          'O NXDOMAIN indica que aquele resolvedor não encontrou o nome.',
          'Há pelo menos uma explicação de configuração, não apenas de ataque.',
        ],
        choices: [
          { id: 'a', label: 'O host foi comprometido e está exfiltrando dados.', rationale: 'Salta para uma conclusão grave sem payload, TCP ou outras evidências. NXDOMAIN não demonstra exfiltração.' },
          { id: 'b', label: 'Há um problema de resolução de nome interno ou de configuração de DNS.', rationale: 'Correto. O padrão é compatível com resolvedor externo configurado para uma zona interna e precisa de correlação.' },
          { id: 'c', label: 'O firewall bloqueou todo o tráfego.', rationale: 'As consultas externas chegaram e receberam resposta, então não houve bloqueio total.' },
          { id: 'd', label: 'O servidor web está fora do ar.', rationale: 'NXDOMAIN ocorre antes de qualquer conexão ao servidor; não avalia a disponibilidade dele.' },
        ],
        answerId: 'b',
        explanation:
          'A observação é compatível com falha de resolução de nome. Uma conclusão de comprometimento exigiria outras fontes e um encadeamento muito mais robusto.',
      },
      {
        id: 'C1-E2',
        kind: 'order',
        objective: 'Sequenciar a correlação de evidências.',
        difficulty: 'avancado',
        prompt:
          'Ordene o tratamento de fontes heterogêneas em uma investigação de tráfego.',
        hints: [
          'A integridade da cópia deve ser registrada antes da análise destrutiva.',
          'Horários só podem ser comparados depois de normalizados.',
        ],
        items: [
          { id: 'normalize', label: 'Normalizar fusos e ordenar eventos' },
          { id: 'preserve', label: 'Registrar origem, coleta e hash das cópias' },
          { id: 'conclude', label: 'Separar observações, inferências e limitações' },
          { id: 'correlate', label: 'Correlacionar IPs, portas, nomes e janelas' },
          { id: 'hypothesis', label: 'Testar hipóteses alternativas com as fontes disponíveis' },
        ],
        correctOrder: ['preserve', 'normalize', 'correlate', 'hypothesis', 'conclude'],
        explanation:
          'Preservar e documentar vem antes de analisar. A correlação exige tempo normalizado. Hipóteses alternativas devem ser testadas antes de uma conclusão que reconheça limites.',
      },
      {
        id: 'C1-E3',
        kind: 'multi',
        objective: 'Reconhecer limites de visibilidade.',
        difficulty: 'avancado',
        prompt:
          'Quais afirmações sobre ausência de eventos em um log são metodologicamente corretas?',
        hints: [
          'A ausência pode ter causas de coleta.',
          'Um log é um recorte do que o sensor observou.',
        ],
        choices: [
          { id: 'a', label: 'A ausência pode indicar lacuna de coleta ou filtro no sensor.', rationale: 'Correto. A visibilidade depende do ponto de captura e da configuração.' },
          { id: 'b', label: 'A ausência não prova, sozinha, que o evento não ocorreu.', rationale: 'Correto. É uma limitação da fonte, não uma prova negativa universal.' },
          { id: 'c', label: 'Se um evento não aparece, ele necessariamente não aconteceu.', rationale: 'Incorreto. Essa é justamente a inferência que a metodologia precisa evitar.' },
          { id: 'd', label: 'Cruzar outra fonte pode reduzir a incerteza.', rationale: 'Correto. Fontes independentes ajudam a compensar pontos cegos.' },
        ],
        correctIds: ['a', 'b', 'd'],
        explanation:
          'Registrar a ausência como limitação e buscar fontes complementares é diferente de tratar o silêncio de um log como prova de inexistência.',
      },
    ],
    takeaways: [
      'Normalize o tempo antes de comparar logs.',
      'Correlacione múltiplos campos e janelas, não um único IOC.',
      'Ausência de evidência pode ser limitação de coleta.',
      'Uma conclusão de incidente precisa de hipóteses alternativas testadas.',
    ],
  },
  {
    id: 'custodia-integridade',
    trackId: 'pericia',
    moduleId: 'pericia-metodo',
    order: 1,
    title: 'Custódia, integridade e o que um hash prova',
    eyebrow: 'Método antes da ferramenta',
    summary:
      'Preserve, identifique e documente evidências digitais. Entenda o papel do hash, os limites da correspondência e a diferença entre observação, inferência e conclusão.',
    minutes: 18,
    difficulty: 'avancado',
    competency: 'forense',
    objectives: [
      'Aplicar os conceitos de identificação, coleta, acondicionamento e rastreabilidade.',
      'Explicar o que a correspondência de hash verifica e o que ela não comprova.',
      'Separar fatos observados, inferências e conclusões em um relatório técnico.',
    ],
    prerequisites: ['Noções de redes e logs. Recomendado: Do log ao incidente.'],
    blocks: [
      {
        kind: 'paragraph',
        text: 'Evidência digital é frágil e fácil de alterar. O método pericial não começa quando uma ferramenta é aberta: começa quando o examinador registra o que recebeu, de onde veio, em que estado e com qual finalidade. Sem rastreabilidade, uma análise tecnicamente correta pode não ser verificável.',
      },
      {
        kind: 'steps',
        title: 'Cadeia de custódia em termos operacionais',
        steps: [
          { title: 'Reconhecer e delimitar', text: 'Identifique fontes pertinentes ao escopo autorizado. Registre o que não será coletado e por quê.' },
          { title: 'Coletar e identificar', text: 'Use método proporcional e documentado. Evite operar diretamente sobre o original.' },
          { title: 'Calcular e registrar integridade', text: 'Produza hashes da cópia e, quando possível, do original. Registre algoritmo, ferramenta e horário.' },
          { title: 'Acondicionar e transferir', text: 'Documente quem manuseou, quando, onde e para onde. Preserve lacres ou controles equivalentes.' },
          { title: 'Examinar e correlacionar', text: 'Trabalhe sobre cópias verificadas. Registre comandos, filtros e transformações relevantes.' },
          { title: 'Relatar e distinguir', text: 'Separe observação, inferência e conclusão. Explicite confiança, lacunas e hipóteses não verificadas.' },
        ],
      },
      {
        kind: 'code',
        label: 'Exemplo de verificação de integridade',
        code: `# Exemplo didático: calcule na cópia de trabalho
sha256sum evidencia.dd
# 9f2c...  evidencia.dd

# Registro de custódia (exemplo)
EVID-014 | origem: servidor portal | cópia de trabalho
coleta: 14/09/2026 09:20 BRT | operador: equipe fictícia
hash SHA-256: 9f2c... | verificado em: 14/09/2026 10:05 BRT`,
      },
      {
        kind: 'callout',
        tone: 'limite',
        title: 'Hash correspondente não é sinônimo de autenticidade',
        text: 'A correspondência de hash indica que duas sequências de bytes são iguais sob aquele algoritmo. Ela contribui para verificar que uma cópia não mudou em relação a uma referência. Não comprova quem produziu o arquivo, quando ele foi criado, se o conteúdo é verdadeiro ou se a origem histórica é legítima. Também não substitui o registro de custódia.',
      },
      {
        kind: 'heading',
        text: 'Três camadas de afirmação',
      },
      {
        kind: 'table',
        headers: ['Camada', 'Pergunta', 'Exemplo'],
        rows: [
          ['Observação', 'O que o registro mostra?', 'O firewall aceitou UDP/53 de 10.30.4.23 para 8.8.8.8 às 11:06Z.'],
          ['Inferência', 'O que isso provavelmente significa?', 'O cliente consultava um resolvedor externo, compatível com o lease DHCP.'],
          ['Conclusão', 'O que posso sustentar, com qual confiança?', 'A configuração entregue por DHCP é a causa provável da falha seletiva, com base em E-01, E-03, E-05 e E-06.'],
        ],
      },
      {
        kind: 'callout',
        tone: 'atencao',
        title: 'Não transforme o relatório em acusação',
        text: 'Um nome em um formulário de mudança não estabelece autoria, intenção ou responsabilidade individual. A análise técnica deve descrever o que as evidências sustentam e indicar quais fontes adicionais seriam necessárias para outras perguntas.',
      },
      {
        kind: 'callout',
        tone: 'nota',
        title: 'Base educacional, não consultoria jurídica',
        text: 'Os fundamentos deste módulo dialogam com referências como NIST SP 800-86 e o Código de Processo Penal brasileiro (cadeia de custódia, art. 158-A e seguintes), além da LGPD quando houver dados pessoais. Requisitos concretos variam por instituição, jurisdição e finalidade. A plataforma é educacional e não substitui orientação jurídica nem protocolo institucional.',
      },
    ],
    exercises: [
      {
        id: 'D1-E1',
        kind: 'mcq',
        objective: 'Delimitar o que a verificação de hash demonstra.',
        difficulty: 'avancado',
        prompt:
          'Ao final de um exame, o hash SHA-256 de uma cópia de trabalho é idêntico ao hash registrado na aquisição. O que isso permite afirmar?',
        hints: [
          'O hash é uma função do conteúdo, não uma assinatura de identidade.',
          'Integridade não é o mesmo que autenticidade histórica.',
        ],
        choices: [
          { id: 'a', label: 'Que a cópia não foi alterada desde a referência registrada.', rationale: 'Correto. A igualdade dos resumos é compatível com integridade da cópia em relação ao valor de referência, dentro do método empregado.' },
          { id: 'b', label: 'Que o conteúdo é verdadeiro e produzido pelo responsável indicado.', rationale: 'Incorreto. O hash não autentica autor, intenção ou veracidade do conteúdo.' },
          { id: 'c', label: 'Que a origem histórica do arquivo está comprovada.', rationale: 'Incorreto. Origem exige documentação, contexto e outras fontes; o hash não a comprova sozinho.' },
          { id: 'd', label: 'Que a cadeia de custódia está completa e correta.', rationale: 'Incorreto. A correspondência de hash não substitui registros de custódia, lacres e rastreabilidade.' },
        ],
        answerId: 'a',
        explanation:
          'O hash contribui para verificar integridade. Autenticidade, origem e responsabilidade dependem de contexto, custódia e outras evidências.',
      },
      {
        id: 'D1-E2',
        kind: 'order',
        objective: 'Sequenciar procedimentos de preservação e exame.',
        difficulty: 'avancado',
        prompt:
          'Ordene uma sequência defensável para tratar uma cópia sintética de log recebida para exame.',
        hints: [
          'Identificar e documentar a origem vem antes de analisar.',
          'A análise ocorre sobre cópia verificada, com registro do que foi feito.',
        ],
        items: [
          { id: 'examine', label: 'Examinar a cópia e registrar filtros e transformações' },
          { id: 'identify', label: 'Identificar a fonte, o escopo e a finalidade autorizada' },
          { id: 'report', label: 'Relatar observações, inferências, conclusão e limitações' },
          { id: 'hash', label: 'Calcular e registrar o hash da cópia; comparar com a referência' },
          { id: 'document', label: 'Registrar coleta, responsável, horário, método e armazenamento' },
        ],
        correctOrder: ['identify', 'document', 'hash', 'examine', 'report'],
        explanation:
          'A sequência preserva a possibilidade de verificação. Documentar e calcular integridade antecedem o exame. O relatório separa o que foi observado do que foi inferido.',
      },
      {
        id: 'D1-E3',
        kind: 'multi',
        objective: 'Selecionar critérios de um relatório técnico responsável.',
        difficulty: 'avancado',
        prompt:
          'Quais elementos devem estar presentes em um relatório pericial tecnicamente responsável sobre o caso estudado?',
        hints: [
          'Conclusões exigem limites claros.',
          'Registros administrativos podem não comprovar autoria.',
        ],
        choices: [
          { id: 'a', label: 'Separação entre fatos observados, inferências e conclusão.', rationale: 'Correto. A separação permite avaliar o que é sustentado por cada fonte.' },
          { id: 'b', label: 'Explicitação de lacunas, fusos e visibilidade limitada.', rationale: 'Correto. Limitações afetam o alcance da conclusão e devem ser declaradas.' },
          { id: 'c', label: 'Atribuição de responsabilidade individual baseada apenas no campo solicitante.', rationale: 'Incorreto. O campo não autentica autoria, intenção ou responsabilidade.' },
          { id: 'd', label: 'Grau de confiança compatível com a força das evidências.', rationale: 'Correto. A confiança precisa ser calibrada e justificada.' },
          { id: 'e', label: 'Afirmação de que o hash garante a autenticidade histórica dos fatos.', rationale: 'Incorreto. O hash verifica integridade da cópia, não a veracidade histórica.' },
        ],
        correctIds: ['a', 'b', 'd'],
        explanation:
          'Um relatório responsável distingue camadas de afirmação, declara limites e calibra a confiança. Ele não transforma um nome em prova de autoria nem um hash em garantia de verdade histórica.',
      },
    ],
    takeaways: [
      'Custódia é rastreabilidade documentada, não apenas um formulário.',
      'Hash contribui para integridade; não prova autoria ou veracidade.',
      'Observações, inferências e conclusões precisam ser distinguidas.',
      'Limitações e confiança fazem parte da conclusão, não são rodapé opcional.',
    ],
  },
  {
    id: 'codificacao-hash-cifra',
    trackId: 'criptografia',
    moduleId: 'cripto-fundamentos',
    order: 1,
    title: 'Codificação, hash e cifra não são a mesma coisa',
    eyebrow: 'Transformações com finalidades diferentes',
    summary:
      'Diferencie formatos legíveis, resumos de integridade e cifras. Execute transformações reais, reconheça limites e recupere uma mensagem didática sem prometer o impossível.',
    minutes: 18,
    difficulty: 'intermediario',
    competency: 'cripto',
    objectives: [
      'Classificar uma transformação como codificação, hash ou cifra pela finalidade e pelas propriedades.',
      'Executar e verificar transformações didáticas com resultado calculado.',
      'Reconhecer por que um hash não é reversível por operação inversa e quando uma cifra clássica pode ser atacada.',
    ],
    prerequisites: ['Nenhum, mas ajuda ter concluído um módulo de redes ou método.'],
    blocks: [
      {
        kind: 'table',
        headers: ['Transformação', 'Objetivo', 'Reversível?', 'Exemplo'],
        rows: [
          ['Codificação', 'Representar dados em outro formato', 'Sim, pela operação inversa', 'Base64, hexadecimal, UTF-8'],
          ['Hash', 'Produzir um resumo de tamanho fixo', 'Não por inversão simples', 'SHA-256, SHA-1 (didático)'],
          ['Cifra simétrica', 'Confidencialidade com chave compartilhada', 'Sim, com a chave correta', 'AES'],
          ['Cifra assimétrica', 'Confidencialidade/assinatura com par de chaves', 'Sim, com a chave privada correspondente', 'RSA, ECC'],
          ['Assinatura digital', 'Autenticar origem e integridade de uma mensagem', 'Verificação com chave pública', 'RSA-PSS, ECDSA'],
        ],
      },
      {
        kind: 'paragraph',
        text: 'Base64 não é criptografia. Ele transforma bytes em caracteres para transporte ou armazenamento e pode ser desfeito por qualquer pessoa que conheça o formato. Um hash não é uma cifra: ele comprime informação de forma unilateral, e não existe uma operação inversa que recupere o texto original a partir do resumo.',
      },
      {
        kind: 'callout',
        tone: 'limite',
        title: 'Hashes e senhas',
        text: 'Um hash criptográfico bem implementado é resistente a pré-imagem, mas senhas fracas podem ser testadas por dicionário e força bruta. Por isso, sistemas sérios usam funções próprias para senhas, com sal e custo ajustável (por exemplo, Argon2id, scrypt ou bcrypt), não um SHA-256 simples. Ataques de dicionário não "revertem" o hash: comparam candidatos.',
      },
      {
        kind: 'heading',
        text: 'Cifras clássicas: didáticas, não seguras',
      },
      {
        kind: 'paragraph',
        text: 'César desloca cada letra por um valor fixo. Vigenère usa uma chave para variar o deslocamento. Essas cifras são úteis para aprender frequência, espaço de chaves e análise, mas não oferecem segurança moderna. Uma chave pequena permite testar todas as possibilidades; padrões de linguagem sobrevivem à substituição.',
      },
      {
        kind: 'code',
        label: 'Exemplo calculado (César, deslocamento 3)',
        code: `original:  MENSAGEM
deslocamento: 3
resultado: PHQVDJHP

O resultado não contém informação sobre a chave.
Com 26 possibilidades, um analista pode testar cada uma.
Em segurança moderna, força bruta de chave não é viável
para algoritmos e tamanhos de chave adequados.`,
      },
      {
        kind: 'callout',
        tone: 'atencao',
        title: 'Não prometa descriptografia que os dados não sustentam',
        text: 'Se um arquivo foi protegido por criptografia moderna e a chave não está disponível, uma ferramenta não deve fingir sucesso. O exercício pode recuperar uma cifra clássica porque o espaço de chaves é mínimo e a mensagem é didática. Isso não se generaliza para AES, RSA ou TLS bem implementados.',
      },
      {
        kind: 'callout',
        tone: 'nota',
        title: 'Metadados também são evidência',
        text: 'Formato, tamanho, codificação, cabeçalhos e horários podem orientar uma análise. Eles não substituem o conteúdo e podem ser alterados. Registre como cada conclusão foi obtida.',
      },
    ],
    exercises: [
      {
        id: 'E1-E1',
        kind: 'mcq',
        objective: 'Classificar transformações pela finalidade e propriedade.',
        difficulty: 'intermediario',
        prompt:
          'Uma ferramenta transforma `"mensagem"` em `bWVuc2FnZW0=`. Qual é a natureza dessa transformação?',
        hints: [
          'Qualquer pessoa consegue reverter com uma operação simples?',
          'Há chave secreta envolvida?',
        ],
        choices: [
          { id: 'a', label: 'Criptografia simétrica, porque usa uma chave.', rationale: 'Não há chave nesse processo; o resultado pode ser decodificado por qualquer pessoa que reconheça o formato.' },
          { id: 'b', label: 'Hash irreversível, porque o resultado é diferente do original.', rationale: 'O formato Base64 é reversível pelos bytes originais; um hash não tem essa propriedade.' },
          { id: 'c', label: 'Codificação Base64, reversível sem chave.', rationale: 'Correto. Base64 representa bytes de outra forma; não confidencializa.' },
          { id: 'd', label: 'Assinatura digital, porque autentica a mensagem.', rationale: 'Não há chave, assinatura ou autenticação de origem. Base64 não oferece integridade criptográfica.' },
        ],
        answerId: 'c',
        explanation:
          'Base64 é uma codificação de transporte/representação. A reversão é uma decodificação, não um ataque criptográfico. Segurança não vem do formato.',
      },
      {
        id: 'E1-E2',
        kind: 'short',
        objective: 'Aplicar a operação inversa de uma cifra de César.',
        difficulty: 'iniciante',
        prompt:
          'Decifre `PHQVDJHP`, produzido por uma cifra de César com deslocamento 3. Informe apenas o texto original.',
        placeholder: 'Texto decifrado',
        accepted: ['mensagem'],
        sampleAnswer: 'MENSAGEM',
        hints: [
          'Para reverter um deslocamento de 3, aplique o deslocamento inverso.',
          'P → M, H → E, Q → N. Continue a sequência.',
        ],
        explanation:
          'Deslocando cada letra três posições para trás, PHQVDJHP volta a MENSAGEM. A operação é determinística e reversível porque a chave é conhecida e o espaço de chaves é mínimo.',
      },
      {
        id: 'E1-E3',
        kind: 'multi',
        objective: 'Delimitar o que a comparação de hash demonstra.',
        difficulty: 'avancado',
        prompt:
          'Um arquivo e sua cópia apresentam o mesmo SHA-256. Quais afirmações são corretas?',
        hints: [
          'Atente para as palavras "integridade", "autoria" e "veracidade".',
          'O hash não carrega contexto histórico.',
        ],
        choices: [
          { id: 'a', label: 'As duas sequências de bytes são compatíveis sob esse algoritmo.', rationale: 'Correto. A igualdade do resumo é o resultado esperado para os mesmos bytes.' },
          { id: 'b', label: 'A cópia não sofreu alteração em relação à referência comparada.', rationale: 'Correto. É uma verificação de integridade em relação a um valor de referência.' },
          { id: 'c', label: 'O autor do arquivo está comprovado.', rationale: 'Incorreto. Hash não autentica autor.' },
          { id: 'd', label: 'A veracidade histórica do conteúdo está comprovada.', rationale: 'Incorreto. O conteúdo pode ser falso e ainda assim ter um hash consistente.' },
          { id: 'e', label: 'O hash substitui a cadeia de custódia.', rationale: 'Incorreto. Custódia documenta manuseio e rastreabilidade; hash é apenas um dos controles de integridade.' },
        ],
        correctIds: ['a', 'b'],
        explanation:
          'A correspondência apoia a verificação de integridade. Não comprova autor, veracidade, origem histórica ou custódia completa.',
      },
    ],
    takeaways: [
      'Codificação muda a representação; não garante confidencialidade.',
      'Hash gera resumo e não possui inversão simples para o conteúdo original.',
      'Cifra clássica pode ser quebrada por espaço de chaves e análise de padrões; isso não se aplica automaticamente a criptografia moderna.',
      'Integridade, autenticidade e veracidade são propriedades diferentes.',
    ],
  },
]

export const tracks: Track[] = [
  {
    id: 'redes',
    code: 'A',
    title: 'Fundamentos de Redes',
    tagline: 'Entender o caminho antes de consertá-lo.',
    description:
      'Do encapsulamento ao DNS: um percurso curto, aplicado e conectado aos sintomas que aparecem em um suporte real.',
    competency: ['redes', 'diagnostico'],
    outcome: 'Explicar como um pacote chega ao destino e localizar em qual camada uma falha começa.',
    modules: [
      {
        id: 'redes-fundamentos',
        title: 'Fundamentos em prática',
        summary: 'Cinco unidades com cálculos, leitura de comandos e decisões de diagnóstico.',
        status: 'disponivel',
        lessonIds: ['caminho-do-pacote', 'ipv4-cidr', 'arp-gateway-rota', 'tcp-udp-dns-dhcp', 'vlans-firewall-tls'],
        labIds: ['lab-redes'],
      },
      {
        id: 'redes-servicos',
        title: 'Serviços, wireless e operação',
        summary:
          'Aprofundamento em DHCP relay, DNS autoritativo, Wi-Fi, MTU e análise de latência. Em expansão após o MVP.',
        status: 'em-expansao',
        lessonIds: [],
      },
    ],
  },
  {
    id: 'administracao',
    code: 'B',
    title: 'Administração e Troubleshooting',
    tagline: 'Reduzir incerteza com método, não com tentativa.',
    description:
      'Um método de diagnóstico aplicado a topologias com falhas configuráveis, saídas de terminal e registros de intervenção.',
    competency: ['diagnostico', 'redes'],
    outcome: 'Conduzir um diagnóstico reproduzível, alterando o mínimo necessário e justificando a causa.',
    modules: [
      {
        id: 'admin-campo',
        title: 'Diagnóstico em campo',
        summary: 'Método, leitura de sintomas e prática no simulador de rede.',
        status: 'disponivel',
        lessonIds: ['metodo-troubleshooting'],
        labIds: ['lab-redes'],
      },
      {
        id: 'admin-cenarios',
        title: 'Cenários avançados',
        summary:
          'Intermitência, perda de pacotes, MTU, DHCP relay e falhas de firewall em topologias maiores. Em expansão.',
        status: 'em-expansao',
        lessonIds: [],
      },
    ],
  },
  {
    id: 'seguranca',
    code: 'C',
    title: 'Cibersegurança',
    tagline: 'Observar comportamento e resistir a conclusões fáceis.',
    description:
      'Leitura de logs, IOCs, correlação e limites de visibilidade, com análise de tráfego sintético e hipóteses alternativas.',
    competency: ['seguranca', 'forense'],
    outcome: 'Explicar um comportamento de rede com evidências e reconhecer o que ainda não pode ser afirmado.',
    modules: [
      {
        id: 'seguranca-deteccao',
        title: 'Detecção e análise',
        summary: 'Do log ao incidente, com prática de filtros e correlação no laboratório de tráfego.',
        status: 'disponivel',
        lessonIds: ['log-a-incidente'],
        labIds: ['lab-trafego'],
      },
      {
        id: 'seguranca-resposta',
        title: 'Resposta e contenção',
        summary:
          'Reconstrução de eventos, contenção, comunicação e análise de exfiltração em maior profundidade. Em expansão.',
        status: 'em-expansao',
        lessonIds: [],
      },
    ],
  },
  {
    id: 'pericia',
    code: 'D',
    title: 'Perícia Digital e Forense de Redes',
    tagline: 'Método, integridade e conclusões que resistem à revisão.',
    description:
      'O eixo central da plataforma. Custódia, integridade, correlação de fontes e um caso completo com relatório e rubrica.',
    competency: ['forense', 'seguranca', 'diagnostico'],
    outcome: 'Reconstruir um incidente a partir de fontes múltiplas, separar fato de inferência e comunicar limitações.',
    modules: [
      {
        id: 'pericia-metodo',
        title: 'Método pericial',
        summary: 'Custódia, integridade e o caso do portal indisponível.',
        status: 'disponivel',
        lessonIds: ['custodia-integridade'],
        caseIds: ['portal-fora-do-ar'],
        labIds: ['lab-trafego'],
      },
      {
        id: 'pericia-casos',
        title: 'Casos combinados',
        summary:
          'Integridade de arquivo, exfiltração, movimentação lateral e casos sem conclusão possível. Em preparação.',
        status: 'em-expansao',
        lessonIds: [],
      },
    ],
  },
  {
    id: 'criptografia',
    code: 'E',
    title: 'Criptografia e Criptoanálise',
    tagline: 'Diferenciar transformação de segurança.',
    description:
      'Codificação, hash e cifras com execução real, análise de frequência e recuperação didática sem promessas irrealistas.',
    competency: ['cripto', 'forense'],
    outcome: 'Classificar transformações, calcular resultados verificáveis e reconhecer os limites da recuperação.',
    modules: [
      {
        id: 'cripto-fundamentos',
        title: 'Transformações e limites',
        summary: 'Uma unidade conceitual e um laboratório com César, Vigenère, Base64 e SHA-256.',
        status: 'disponivel',
        lessonIds: ['codificacao-hash-cifra'],
        labIds: ['lab-cripto'],
      },
      {
        id: 'cripto-analise',
        title: 'Criptoanálise aplicada',
        summary:
          'Análise de frequência assistida, formatos de arquivo, verificação de integridade e limites de ataques de dicionário. Em expansão.',
        status: 'em-expansao',
        lessonIds: [],
      },
    ],
  },
]

export interface LabDefinition {
  id: string
  title: string
  subtitle: string
  route: string
  competency: CompetencyId
  minutes: number
  difficulty: string
  description: string
  outcomes: string[]
  linkedCaseId?: string
}

export const labs: LabDefinition[] = [
  {
    id: 'lab-redes',
    title: 'Simulador de rede · Filial Aurora',
    subtitle: 'Topologia, terminal e eventos derivados do estado',
    route: '/laboratorio/redes',
    competency: 'diagnostico',
    minutes: 25,
    difficulty: 'iniciante a avançado',
    description:
      'Investigue quatro falhas em uma topologia com VLAN, roteamento, DNS e servidor. Edite configurações, execute comandos simulados e acompanhe os pacotes gerados.',
    outcomes: [
      'Executar testes em ordem coerente',
      'Relacionar configuração e falha observada',
      'Interpretar saídas e eventos de rede',
    ],
  },
  {
    id: 'lab-trafego',
    title: 'Análise de tráfego · Consulta externa',
    subtitle: 'Filtros, detalhes de pacote e limites da captura',
    route: '/laboratorio/trafego',
    competency: 'seguranca',
    minutes: 20,
    difficulty: 'intermediário',
    description:
      'Explore um recorte sintético de cabeçalhos, filtre eventos, leia códigos DNS e responda a três questões de análise sem extrapolar os dados.',
    outcomes: [
      'Filtrar eventos por protocolo e texto',
      'Interpretar NXDOMAIN e handshake',
      'Reconhecer limites de uma captura',
    ],
  },
  {
    id: 'lab-cripto',
    title: 'Laboratório criptográfico',
    subtitle: 'Cálculo real, análise e desafio em camadas',
    route: '/laboratorio/cripto',
    competency: 'cripto',
    minutes: 25,
    difficulty: 'intermediário',
    description:
      'Execute César, Vigenère, Base64 e SHA-256; compare resultados; investigue uma mensagem didática em camadas e verifique integridade.',
    outcomes: [
      'Calcular transformações verificáveis',
      'Analisar frequência e candidatos de César',
      'Verificar hash e explicar seus limites',
    ],
  },
]

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id)
}

export function getTrack(id: string): Track | undefined {
  return tracks.find((track) => track.id === id)
}

export function getTrackLessons(track: Track): Lesson[] {
  return track.modules.flatMap((module) =>
    module.lessonIds
      .map((lessonId) => getLesson(lessonId))
      .filter((lesson): lesson is Lesson => Boolean(lesson)),
  )
}

export function getLessonTrack(lesson: Lesson): Track | undefined {
  return getTrack(lesson.trackId)
}

export function getNextLesson(lessonId: string): Lesson | undefined {
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  return index >= 0 ? lessons[index + 1] : undefined
}
