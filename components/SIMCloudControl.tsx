
import { useState, useEffect, CSSProperties } from 'react';

export default function SIMCloudControl() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dwgPorts, setDwgPorts] = useState<number[]>([]);
  const [simbankPorts, setSimbankPorts] = useState<number[]>([]);
  const [excludedDwgPorts, setExcludedDwgPorts] = useState<number[]>([]);
  const [excludedSimbankPorts, setExcludedSimbankPorts] = useState<number[]>([]);
  const [activeBindings, setActiveBindings] = useState<{ dwg: number; sim: number }[]>([]);

  const [groupName, setGroupName] = useState('');
  const [savedGroups, setSavedGroups] = useState<Record<string, number[]>>({});

  
  const [simRange, setSimRange] = useState('');


  const selecionarIntervaloSIMBank = () => {
    const match = simRange.match(/(\d+)\s*~\s*(\d+)/);
    if (!match) return alert('Formato inválido. Use o padrão: 5~20');
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    if (isNaN(start) || isNaN(end) || start < 0 || end > 127 || start > end) {
      return alert('Intervalo inválido.');
    }
    const selecionados = [];
    for (let i = start; i <= end; i++) {
      if (!excludedSimbankPorts.includes(i)) {
        selecionados.push(i);
      }
    }
    setSimbankPorts(selecionados);
  };


  const excluirGrupo = async (name: string) => {
    const updated = { ...savedGroups };
    delete updated[name];
    setSavedGroups(updated);

    await fetch('/api/simcloud/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'simbankGroups', data: updated })
    });

    alert(`Grupo '${name}' excluído do Firebase`);
  };


  const portaGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
    gap: 8,
    maxHeight: 200,
    overflowY: 'auto',
    padding: 10,
    background: '#fafafa',
    border: '1px solid #ccc',
    borderRadius: 6
  };

  const selecionarTodasPortasDWG = () => {
    const todasDwg = Array.from({ length: 32 }, (_, i) => i).filter(p => !excludedDwgPorts.includes(p));
    setDwgPorts(todasDwg);
  };

  const limparTodasPortasDWG = () => {
    setDwgPorts([]);
  };

  const selecionarTodasPortasSIMBank = () => {
    const todasSim = Array.from({ length: 128 }, (_, i) => i).filter(p => !excludedSimbankPorts.includes(p));
    setSimbankPorts(todasSim);
  };

  const limparTodasPortasSIMBank = () => {
    setSimbankPorts([]);
  };

  // Original função unificada foi removida abaixo
  const selecionarTodasPortas = () => {
    const todasDwg = Array.from({ length: 32 }, (_, i) => i).filter(p => !excludedDwgPorts.includes(p));
    const todasSim = Array.from({ length: 128 }, (_, i) => i).filter(p => !excludedSimbankPorts.includes(p));
    setDwgPorts(todasDwg);
    setSimbankPorts(todasSim);
  };

  const limparTodasPortas = () => {
    setDwgPorts([]);
    setSimbankPorts([]);
  };

  useEffect(() => {
    fetch('/api/simcloud/bindings')
      .then(res => res.json())
      .then(data => setActiveBindings(data.bindings || []));

    fetch('/api/simcloud/settings')
      .then(res => res.json())
      .then(data => {
        if (data.excludedDwgPorts) setExcludedDwgPorts(data.excludedDwgPorts);
        if (data.excludedSimbankPorts) setExcludedSimbankPorts(data.excludedSimbankPorts);
        if (data.simbankGroups) setSavedGroups(data.simbankGroups);
      });
  }, []);

  const fetchWithLog = async (cmd: string, body: any = null) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/simcloud/cmd?cmd=${cmd}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      const text = await res.text();
      setLogs(prev => [...prev, `\n--- ${cmd} ---\n${text}`]);

      await fetch('/api/simcloud/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd, port: body?.portNo ?? null, response: text })
      });

      if (cmd === 'GetAllSms' && body?.portNo) {
        const match = text.match(/<Content>(.*?)<\/Content>/);
        const content = match?.[1];
        if (content) {
          await fetch('/api/simcloud/sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ port: body.portNo, content })
          });
        }
      }

      return text;
    } catch (err) {
      setLogs(prev => [...prev, `\n[Erro ao executar ${cmd}]`]);
    } finally {
      setLoading(false);
    }
  };

  const iniciarTroca = async () => {
    const bindings = dwgPorts
      .filter(port => !excludedDwgPorts.includes(port))
      .map((port, idx) => ({
        dwg: port,
        sim: simbankPorts[idx % simbankPorts.length]
      }))
      .filter(b => !excludedSimbankPorts.includes(b.sim));

    for (const b of bindings) {
      await fetchWithLog('SetGwpInfo', {
        portNo: b.dwg,
        bindDeviceId: 2,
        bindPortNo: b.sim
      });
    }

    setActiveBindings(bindings);

    await fetch('/api/simcloud/bindings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bindings })
    });

    setTimeout(() => verificarPortas(bindings), 90000);
  };

  const verificarPortas = async (bindings: { dwg: number; sim: number }[]) => {
    for (const b of bindings) {
      await fetchWithLog('GetPortInfo', { portNo: b.dwg });
    }
  };

  const solicitarUssd = async (port: number) => await fetchWithLog('SendSpecUssd', { portNo: port });
  const atualizarSms = async (port: number) => await fetchWithLog('GetAllSms', { portNo: port });
  const getAllUssd = async (port: number) => await fetchWithLog('GetAllUssd', { portNo: port });
  const getSpecUssd = async (port: number) => await fetchWithLog('GetSpecUssd', { portNo: port });

  const salvarGrupo = async () => {
    if (!groupName) return;
    const updated = { ...savedGroups, [groupName]: simbankPorts };
    setSavedGroups(updated);

    await fetch('/api/simcloud/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'simbankGroups', data: updated })
    });

    alert(`Grupo '${groupName}' salvo no Firebase`);
    setGroupName('');
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>SIMCloud Web Interface</h1>

      <section>
        

        <h2>Selecionar Portas DWG (0–31)</h2>
        <p>Selecionadas: {dwgPorts.length}</p>
        <div style={portaGridStyle}>
          {Array.from({ length: 32 }, (_, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={dwgPorts.includes(i)}
                disabled={excludedDwgPorts.includes(i)}
                onChange={(e) => {
                  if (excludedDwgPorts.includes(i)) return;
                  setDwgPorts(prev => e.target.checked ? [...prev, i] : prev.filter(p => p !== i));
                }}
              /> {i}
            </label>
          ))}
        </div>

        
        <div style={{ marginTop: 10 }}>
          <strong>DWG:</strong>
          <button onClick={selecionarTodasPortasDWG} style={{ marginLeft: 8 }}>Selecionar Todas DWG</button>
          <button onClick={limparTodasPortasDWG} style={{ marginLeft: 8 }}>Limpar Todas DWG</button>
        </div>


        <h3>Portas DWG para pular</h3>
        <input
          type="text"
          placeholder="Ex: 3,7,10"
          value={excludedDwgPorts.join(',')}
          onChange={e => setExcludedDwgPorts(e.target.value.split(',').map(Number))}
        />
        <button
          onClick={async () => {
            await fetch('/api/simcloud/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'excludedDwgPorts', data: excludedDwgPorts })
            });
            alert('Exclusões DWG salvas no Firebase');
          }}
        >
          Salvar exclusões DWG no Firebase
        </button>
        <p>Atualmente ignorando: {excludedDwgPorts.join(', ') || 'nenhuma'}</p>

        
        <h2>Selecionar Portas SIMBank (0–127)</h2>
                

        <div style={{ marginTop: 10 }}>
          <strong>Intervalo SIMBank:</strong>
          <input
            type="text"
            placeholder="Ex: 5~20"
            value={simRange}
            onChange={e => setSimRange(e.target.value)}
            style={{ marginLeft: 8 }}
          />
          <button onClick={selecionarIntervaloSIMBank} style={{ marginLeft: 8 }}>Selecionar Intervalo</button>
        </div>

        <div style={{ marginTop: 10 }}>
          <strong>SIMBank:</strong>
          <button onClick={selecionarTodasPortasSIMBank} style={{ marginLeft: 8 }}>Selecionar Todas SIMBank</button>
          <button onClick={limparTodasPortasSIMBank} style={{ marginLeft: 8 }}>Limpar Todas SIMBank</button>
        </div>

                <div style={portaGridStyle}>
          {Array.from({ length: 128 }, (_, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={simbankPorts.includes(i)}
                disabled={excludedSimbankPorts.includes(i)}
                onChange={(e) => {
                  if (excludedSimbankPorts.includes(i)) return;
                  setSimbankPorts(prev => e.target.checked ? [...prev, i] : prev.filter(p => p !== i));
                }}
              /> {i}
            </label>
          ))}
        </div>

        <h2>Salvar grupo de portas SIMBank</h2>
        <input
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          placeholder="Nome do grupo"
        />
        <button onClick={salvarGrupo}>Salvar Grupo</button>

        <h3>Portas SIMBank para pular</h3>
        <input
          type="text"
          placeholder="Ex: 1,15,20"
          value={excludedSimbankPorts.join(',')}
          onChange={e => setExcludedSimbankPorts(e.target.value.split(',').map(Number))}
        />
        <button
          onClick={async () => {
            await fetch('/api/simcloud/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'excludedSimbankPorts', data: excludedSimbankPorts })
            });
            alert('Exclusões SIMBank salvas no Firebase');
          }}
        >
          Salvar exclusões SIMBank no Firebase
        </button>
        <p>Atualmente ignorando: {excludedSimbankPorts.join(', ') || 'nenhuma'}</p>

        <h3>Usar Grupo Salvo</h3>
        <select onChange={e => setSimbankPorts(savedGroups[e.target.value] || [])}>
          <option value="">Selecione</option>
          {Object.keys(savedGroups).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <div style={{ marginTop: 10 }}>
          <strong>Visualização do Grupo Selecionado:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
            {simbankPorts.map(p => (
              <span key={p} style={{
                padding: '4px 8px',
                background: '#def',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                SIM {p}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            const name = prompt('Digite o nome do grupo a excluir:');
            if (name && savedGroups[name]) excluirGrupo(name);
          }}
          style={{ marginLeft: 8 }}
        >
          Excluir Grupo
        </button>

        <br /><br />
        <button onClick={iniciarTroca} disabled={loading}>Iniciar Troca de Portas</button>
      </section>

      <section>
        <h2>Comandos por Porta</h2>
        {activeBindings.map(b => (
          <div key={b.dwg}>
            <span>Porta DWG {b.dwg} ↔ SIMBank {b.sim} </span>
            <button onClick={() => solicitarUssd(b.dwg)} disabled={loading}>USSD *846#</button>
            <button onClick={() => atualizarSms(b.dwg)} disabled={loading}>Atualizar SMS</button>
            <button onClick={() => getAllUssd(b.dwg)} disabled={loading}>GetAllUssd</button>
            <button onClick={() => getSpecUssd(b.dwg)} disabled={loading}>GetSpecUssd</button>
          </div>
        ))}
      </section>

      <pre style={{ marginTop: 20, background: '#f4f4f4', padding: 10, maxHeight: 400, overflow: 'auto' }}>
        {logs.join('\n')}
      </pre>
    </div>
  );
}