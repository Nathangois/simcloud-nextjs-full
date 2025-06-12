import type { NextApiRequest, NextApiResponse } from 'next';
import dgram from 'dgram';
import { create } from 'xmlbuilder2';
import crypto from 'crypto';
import { db } from '../../../lib/firebase-admin';

const config = {
  ip: '191.7.95.241',
  port: 3030,
  domain: 'default',
  user: 'admin',
  password: '123456',
  deviceSn: 'db01-6302-0300-0078',
  simBankSn: 'db00-0040-c900-0004',
  deviceId: 1
};

function gerarSN(): number {
  return Math.floor(Date.now() % 100000);
}

function gerarAuthInfo(sn: number, cmd: string) {
  const str = `request${sn}${config.domain}${config.user}${cmd}NA${config.password}`;
  return crypto.createHash('md5').update(str).digest('hex');
}

function gerarXML(cmd: string, body: any, sn: number) {
  const auth = gerarAuthInfo(sn, cmd);
  return create({
    simsrv: {
      '@version': '1.0',
      '@msg_type': 'request',
      header: {
        param: [
          { '@name': 'SN', '@value': sn },
          { '@name': 'Domain', '@value': config.domain },
          { '@name': 'User', '@value': config.user },
          { '@name': 'Cmd', '@value': cmd },
          { '@name': 'Retries', '@value': '0' },
          { '@name': 'Timeout', '@value': '5000' },
          { '@name': 'Timestamp', '@value': 'NA' },
          { '@name': 'AuthInfo', '@value': auth }
        ]
      },
      [cmd]: body
    }
  }).end({ prettyPrint: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cmd } = req.query;
  const sn = gerarSN();
  const client = dgram.createSocket('udp4');
  let body: any;

  if (typeof cmd !== 'string') return res.status(400).send('Comando inválido');

  const { portNo, bindDeviceId, bindPortNo } = req.body || {};

  switch (cmd) {
    case 'SetGwpInfo':
      body = {
        param: [
          { '@name': 'DeviceId', '@value': config.deviceId },
          { '@name': 'PortType', '@value': 'GWP' },
          { '@name': 'PortNo', '@value': portNo },
          { '@name': 'AdminStatus', '@value': 'LOCKED' },
          { '@name': 'BindDeviceId', '@value': bindDeviceId },
          { '@name': 'BindPortType', '@value': 'BKP' },
          { '@name': 'BindPortNo', '@value': bindPortNo }
        ]
      };
      break;

    case 'GetPortInfo':
      body = {
        param: [
          { '@name': 'DeviceSn', '@value': config.deviceSn },
          { '@name': 'PortType', '@value': 'GWP' },
          { '@name': 'BeginPortNo', '@value': portNo },
          { '@name': 'EndPortNo', '@value': portNo },
          { '@name': 'MaxGetCount', '@value': '1' }
        ]
      };
      break;

    case 'SendSpecUssd':
      body = {
        param: [
          { '@name': 'TaskType', '@value': 'API' },
          { '@name': 'TaskId', '@value': '100' },
          { '@name': 'DeviceId', '@value': config.deviceId },
          { '@name': 'PortType', '@value': 'GWP' },
          { '@name': 'PortNo', '@value': portNo },
          { '@name': 'UssdParam', '@value': 'SEND' },
          { '@name': 'Content', '@value': '*846#' },
          { '@name': 'MaxRetries', '@value': '0' }
        ]
      };
      break;

    case 'GetAllSms':
      body = {
        param: [
          { '@name': 'DeviceId', '@value': config.deviceId },
          { '@name': 'PortType', '@value': 'GWP' },
          { '@name': 'PortNo', '@value': portNo },
          { '@name': 'BeginSmsSn', '@value': '1001' },
          { '@name': 'Order', '@value': 'DESC' },
          { '@name': 'MaxGetCount', '@value': '1' }
        ]
      };
      break;

    case 'GetAllUssd':
      body = {
        param: [
          { '@name': 'DeviceId', '@value': config.deviceId },
          { '@name': 'PortType', '@value': 'GWP' },
          { '@name': 'PortNo', '@value': portNo },
          { '@name': 'BeginUssdSn', '@value': '1001' },
          { '@name': 'Order', '@value': 'DESC' },
          { '@name': 'MaxGetCount', '@value': '1' }
        ]
      };
      break;

    case 'GetSpecUssd':
      body = {
        param: [
          { '@name': 'DeviceId', '@value': config.deviceId },
          { '@name': 'PortType', '@value': 'GWP' },
          { '@name': 'PortNo', '@value': portNo }
        ]
      };
      break;

    default:
      return res.status(400).send('Comando não suportado');
  }

  const xml = gerarXML(cmd, body, sn);
  const msg = Buffer.from(xml);

  let responded = false;

  try {
    client.send(msg, config.port, config.ip);

    client.once('message', (message) => {
      if (!responded) {
        responded = true;
        res.status(200).send(message.toString());
        client.close();
      }
    });

    setTimeout(() => {
      if (!responded) {
        responded = true;
        res.status(504).send('Timeout de resposta');
        client.close();
      }
    }, 3000);

    client.on('error', (err) => {
      if (!responded) {
        res.status(500).send('Erro no socket UDP');
        responded = true;
        client.close();
      }
    });
  } catch {
    if (!responded) {
      res.status(500).send('Erro ao enviar comando UDP');
      client.close();
    }
  }
}