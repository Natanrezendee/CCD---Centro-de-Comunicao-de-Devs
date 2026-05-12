# CCD — Centro de Comunicação de Devs

O CCD é uma aplicação simples criada para auxiliar pequenas equipes de desenvolvimento na organização de tarefas, comunicação interna e registro de reports técnicos.

## Contexto do Projeto

O projeto surgiu durante meu estágio em um ambiente com infraestrutura extremamente restrita:

- Sem acesso a Git/GitHub nas máquinas;
- Sem permissão para instalar ferramentas;
- Ambiente com diversas limitações administrativas;
- Desenvolvimento compartilhado em uma única máquina;
- Comunicação da equipe acontecendo em dias diferentes;
- Necessidade constante de registrar bugs, tarefas e alterações rapidamente.

Durante o desenvolvimento de sistemas internos, muitas tarefas eram organizadas manualmente em papéis, mensagens soltas e anotações improvisadas.

O CCD nasceu justamente para resolver esse problema de forma simples e prática.

## Objetivo

Centralizar:

- mensagens da equipe;
- acompanhamento de tarefas;
- reports de bugs;
- organização básica do fluxo de desenvolvimento.

Tudo isso em uma aplicação leve, simples e funcional.

## Funcionalidades

- Criação de mensagens para a equipe;
- Menção de desenvolvedores;
- Organização de tarefas;
- Níveis de prioridade:
  - Baixo
  - Médio
  - Alto
  - Crítico
- Controle de tarefas concluídas e pendentes;
- Sistema simples de reports internos;
- Armazenamento local via LocalStorage.

## Tecnologias Utilizadas

- HTML
- CSS
- JavaScript

## Observações

O projeto foi propositalmente desenvolvido sem autenticação e sem banco de dados tradicional.

Como o uso era interno e compartilhado entre poucos desenvolvedores na mesma máquina, a ideia principal era manter:
- simplicidade;
- rapidez;
- praticidade;
- zero dependências externas.

Atualmente os dados são armazenados utilizando LocalStorage do navegador.

## Futuras Melhorias

- Integração com SQLite;
- Persistência real de dados;
- Sistema de autenticação;
- Multiusuário;
- Histórico de atividades;
- Melhorias visuais e organizacionais.
