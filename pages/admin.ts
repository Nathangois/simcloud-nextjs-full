import { useEffect, useState } from 'react';

interface LogEntry {
  cmd: string;
  port: number | null;
  response: string;
  timestamp: string;
}

interface SmsEntry {
  port: number;
  content: string;
  timestamp: string;
}

interface Settings {
  excludedDwgPorts?: number[];
  excludedSimbankPorts?: number[];
  simbankGroups?: Record<string, number[]>;
}

export default function AdminPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sms, setSms] = useState<SmsEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    fetch('/api/simcloud/log')
      .then(res => res.json())
      .then(setLogs)
      .catch(console.error);

    fetch('/api/simcloud/sms')
      .then(res => res.json())
      .then(setSms)
      .catch(console.error);

    fetch('/api/simcloud/settings')
      .then(res => res.json())
      .then(setSettings)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 30, fontFamily: 'Arial' }}>
      <h1>Painel Administrativo SIMCloud</h1>

      <section>
        <h2>Exclusões Salvas</h2>
        <p><strong>DWG:</strong> {settings.excludedDwgPorts?.join(', ') || 'nenhuma'}</p>
        <p><strong>SIMBank:</strong> {settings.excludedSimbankPorts?.join(', ') || 'nenhuma'}</p>
      </section>

      <section>
        <h2>Grupos Salvos SIMBank</h2>
        {settings.simbankGroups ? (
          <ul>
            {Object.entries(settings.simbankGroups).map(([nome, portas]) => (
              <li key={nome}>
                <strong>{nome}:</strong> {portas.join(', ')}
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum grupo salvo</p>
        )}
      </section>

      <section>
        <h2>Logs de Comandos</h2>
        <div style={{ maxHeight: 300, overflowY: 'auto', background: '#eee', padding: 10, whiteSpace: 'pre-wrap' }}>
          {logs.length > 0 ? logs.map((log, i) => (
            <div key={i} style={{ borderBottom: '1px solid #ccc', marginBottom: 8, paddingBottom: 8 }}>
              <strong>[{log.timestamp?.slice(0, 19).replace('T', ' ')}]</strong><br />
              <strong>CMD:</strong> {log.cmd}<br />
              <strong>Porta:</strong> {log.port ?? '-'}<br />
              <strong>Resposta:</strong> {log.response?.slice(0, 300)}{log.response?.length > 300 ? '...' : ''}
            </div>
          )) : <p>Nenhum log disponível</p>}
        </div>
      </section>

      <section>
        <h2>SMS Recebidos</h2>
        <div style={{ maxHeight: 300, overflowY: 'auto', background: '#f9f9f9', padding: 10 }}>
          {sms.length > 0 ? sms.map((s, i) => (
            <p key={i}>
              <strong>Porta {s.port}</strong> [{s.timestamp?.slice(0, 19).replace('T', ' ')}]: {s.content}
            </p>
          )) : <p>Nenhum SMS recebido</p>}
        </div>
      </section>
    </div>
  );
}