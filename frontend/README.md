# SerenOps

SerenOps is a client operations workspace for managing projects, tasks, contracts, invoices, payments, and client communication in one place.

## Core Features

- Dashboard with operational snapshots
- Task and deadline tracking
- Client and project management
- Proposals and contracts workflow
- Invoicing and payment tracking
- Notifications and activity timeline
- Client Portal for approvals, signatures, payments, and feedback

## AI Assistant / Agent

SerenOps includes an AI assistant that can help with operational execution, not just chat.

You can paste client conversations, email threads, meeting notes, or plain instructions into the AI assistant. Based on the context, the assistant can automatically propose and perform updates across the workspace, including:

- Creating or updating tasks
- Assigning or adjusting deadlines
- Updating project status and follow-ups
- Creating draft invoice/payment-related updates
- Capturing important action items from conversations

Example use cases:

- "Here is my full client conversation, extract commitments and update all related tasks and due dates."
- "Client approved scope changes. Update milestones and generate the next invoice draft."
- "Summarize this thread and prepare operational updates I should apply today."

Note: AI-generated updates should still be reviewed by the user before final confirmation in sensitive workflows.

## Getting Started

### Requirements

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run Development Server

```bash
npm start
```

Open `http://localhost:3000` in your browser.

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## Project Scripts

- `npm start` - Run app in development mode
- `npm test` - Run test suite
- `npm run build` - Build production bundle

