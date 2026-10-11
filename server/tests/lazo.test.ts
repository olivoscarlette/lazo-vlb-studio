import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/index.ts';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/middleware/auth.ts';
import { db } from '../src/db/index.ts';

let server: http.Server;
let baseUrl: string;

async function makeRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    data,
    headers: res.headers
  };
}

function createToken(user: { id: string; name: string; email: string; role: string; wedding_id?: string | null }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

describe('LAZO — VLB Studio Planning Test Suite', () => {
  let adminToken: string;
  let coordAToken: string;
  let coordBToken: string;
  let staffAToken: string;
  let noviosAToken: string;
  let noviosBToken: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    adminToken = createToken({ id: 'usr_admin_01', name: 'Valeria Lozano', email: 'admin@vlb.studio', role: 'ADMINISTRADOR', wedding_id: null });
    coordAToken = createToken({ id: 'usr_coord_a', name: 'Mariana Morales', email: 'coordinador@vlb.studio', role: 'COORDINADOR', wedding_id: null });
    coordBToken = createToken({ id: 'usr_coord_b', name: 'Carla Méndez', email: 'carla@vlb.studio', role: 'COORDINADOR', wedding_id: null });
    staffAToken = createToken({ id: 'usr_staff_a', name: 'Diego Salazar', email: 'staff@vlb.studio', role: 'STAFF', wedding_id: null });
    noviosAToken = createToken({ id: 'usr_novios_sofia', name: 'Sofía Villaseñor', email: 'novios.sofia@vlb.studio', role: 'NOVIOS', wedding_id: 'wed_sofia_alejandro' });
    noviosBToken = createToken({ id: 'usr_novios_valeria', name: 'Valeria Domínguez', email: 'novios.valeria@vlb.studio', role: 'NOVIOS', wedding_id: 'wed_valeria_mateo' });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('1. Autenticación: Login con credenciales válidas y erróneas', async () => {
    // Bad credentials
    const badRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@vlb.studio', password: 'wrongpassword' }
    });
    assert.strictEqual(badRes.status, 401);

    // Correct credentials
    const okRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@vlb.studio', password: 'admin123' }
    });
    assert.strictEqual(okRes.status, 200);
    assert.ok(okRes.data.token);
    assert.strictEqual(okRes.data.user.role, 'ADMINISTRADOR');
  });

  test('2. Aislamiento estricto entre bodas (CRÍTICO): Novios y Coordinadores no asignados', async () => {
    // Novios A intentando acceder a Boda B
    const crossResNovios = await makeRequest('/api/weddings/wed_valeria_mateo', {
      headers: { Authorization: `Bearer ${noviosAToken}` }
    });
    assert.strictEqual(crossResNovios.status, 403, 'Novios A no debe poder acceder a Boda B');

    // Coordinador B (solo asignado a Boda B) intentando acceder a Boda A
    const crossResCoord = await makeRequest('/api/weddings/wed_sofia_alejandro', {
      headers: { Authorization: `Bearer ${coordBToken}` }
    });
    assert.strictEqual(crossResCoord.status, 403, 'Coordinador B no asignado debe recibir 403 en Boda A');

    // Staff A intentando acceder a Boda B
    const crossResStaff = await makeRequest('/api/weddings/wed_valeria_mateo', {
      headers: { Authorization: `Bearer ${staffAToken}` }
    });
    assert.strictEqual(crossResStaff.status, 403, 'Staff A no asignado a Boda B debe recibir 403');

    // Administrador puede acceder a Boda A y Boda B
    const adminResA = await makeRequest('/api/weddings/wed_sofia_alejandro', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminResA.status, 200);

    const adminResB = await makeRequest('/api/weddings/wed_valeria_mateo', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminResB.status, 200);
  });

  test('3. Invitados: Creación, conteo de lugares (invitado + acompañantes) y persistencia', async () => {
    const newGuestRes = await makeRequest('/api/weddings/wed_sofia_alejandro/guests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${coordAToken}` },
      body: {
        first_name: 'Santiago',
        last_name: 'Navarro',
        phone: '+52 55 9876 5432',
        companion_count: 2, // 1 guest + 2 companions = 3 lugares!
        status: 'Confirmado',
        table_id: 'tbl_mesa_1',
        observations: 'Acompañante requiere silla periquera.'
      }
    });

    assert.strictEqual(newGuestRes.status, 201);
    const guestId = newGuestRes.data.guest.id;

    // Verificar en lista
    const listRes = await makeRequest('/api/weddings/wed_sofia_alejandro/guests?search=Santiago', {
      headers: { Authorization: `Bearer ${coordAToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const found = listRes.data.guests.find((g: any) => g.id === guestId);
    assert.ok(found);
    assert.strictEqual(found.companion_count, 2);
    assert.strictEqual(found.table_id, 'tbl_mesa_1');
  });

  test('4. Invitados: Regla de cambio a "No asistirá" libera mesa automáticamente', async () => {
    const createRes = await makeRequest('/api/weddings/wed_sofia_alejandro/guests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${coordAToken}` },
      body: {
        first_name: 'Lorena',
        last_name: 'Vargas',
        phone: '+52 55 1234 0000',
        companion_count: 1,
        status: 'Confirmado',
        table_id: 'tbl_mesa_1',
        observations: 'Asignada inicialmente a Mesa 1'
      }
    });
    assert.strictEqual(createRes.status, 201);
    const guestId = createRes.data.guest.id;

    // Cambiar estatus a "No asistirá"
    const updateRes = await makeRequest(`/api/weddings/wed_sofia_alejandro/guests/${guestId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${coordAToken}` },
      body: { status: 'No asistirá' }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.guest.status, 'No asistirá');
    assert.strictEqual(updateRes.data.guest.table_id, null, 'Mesa debe liberarse (null) al cambiar a No asistirá');

    // Verificar en base de datos
    const dbGuest = db.prepare('SELECT status, table_id FROM guests WHERE id = ?').get(guestId) as any;
    assert.strictEqual(dbGuest.status, 'No asistirá');
    assert.strictEqual(dbGuest.table_id, null);
  });

  test('5. Candado de 5 Días en Mesas: Novios bloqueados a <= 5 días, Admin/Coordinador permitidos', async () => {
    // Boda B (wed_valeria_mateo) está configurada a 3 días en el futuro
    // Novios B intenta crear una mesa -> debe ser RECHAZADO con 403
    const noviosEditRes = await makeRequest('/api/weddings/wed_valeria_mateo/tables', {
      method: 'POST',
      headers: { Authorization: `Bearer ${noviosBToken}` },
      body: { name: 'Mesa Novios Intento', type: 'circular', capacity: 10 }
    });
    assert.strictEqual(noviosEditRes.status, 403, 'Novios debe recibir 403 a 5 días o menos');
    assert.ok(noviosEditRes.data.error.includes('Bloqueo operativo'));

    // Admin SÍ puede editar mesa en Boda B a pesar de faltar 3 días
    const adminEditRes = await makeRequest('/api/weddings/wed_valeria_mateo/tables', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'Mesa Ajuste Urgente Admin', type: 'circular', capacity: 10 }
    });
    assert.strictEqual(adminEditRes.status, 201, 'Admin debe poder operar mesas');
  });

  test('6. Reutilización automática de Proveedores: Civil e Iglesia sin duplicación', async () => {
    // Civil
    const civilRes = await makeRequest('/api/weddings/wed_sofia_alejandro/civil', {
      headers: { Authorization: `Bearer ${coordAToken}` }
    });
    assert.strictEqual(civilRes.status, 200);
    const civilVendors = civilRes.data.reusedVendors;
    assert.ok(civilVendors.some((v: any) => v.name.includes('Juez Lic. Fernando Morales')));
    assert.ok(civilVendors.some((v: any) => v.name.includes('Lumière')));
    assert.strictEqual(civilVendors.some((v: any) => v.name.includes('Banquete')), false);

    // Iglesia
    const relRes = await makeRequest('/api/weddings/wed_sofia_alejandro/religious', {
      headers: { Authorization: `Bearer ${coordAToken}` }
    });
    assert.strictEqual(relRes.status, 200);
    const relVendors = relRes.data.reusedVendors;
    assert.ok(relVendors.some((v: any) => v.name.includes('Magnolia Floral')));
    assert.ok(relVendors.some((v: any) => v.name.includes('Lumière')));
  });

  test('7. Resumen Financiero: Costo Real, Monto Pagado, Restante (Sin presupuesto estimado)', async () => {
    const finRes = await makeRequest('/api/weddings/wed_sofia_alejandro/vendors', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(finRes.status, 200);
    const summary = finRes.data.financialSummary;
    assert.ok(summary.costo_real > 0);
    assert.ok(summary.monto_pagado > 0);
    assert.strictEqual(summary.restante, summary.costo_real - summary.monto_pagado);
    assert.strictEqual((summary as any).estimated_budget, undefined);
  });

  test('8. Reportes en tiempo real consolidados', async () => {
    const repRes = await makeRequest('/api/weddings/wed_sofia_alejandro/reports', {
      headers: { Authorization: `Bearer ${coordAToken}` }
    });
    assert.strictEqual(repRes.status, 200);
    assert.ok(repRes.data.guests.total > 0);
    assert.ok(repRes.data.tables.total_mesas > 0);
    assert.ok(repRes.data.finance.costo_real > 0);
    assert.ok(repRes.data.tasks.total > 0);
  });

  test('9. Importación Excel de invitados: validación de campos actuales e ignorar campos eliminados', async () => {
    const importRes = await makeRequest('/api/weddings/wed_sofia_alejandro/guests/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${noviosAToken}` },
      body: {
        guests: [
          {
            NOMBRE: 'Emilio',
            APELLIDO: 'Gutiérrez',
            WHATSAPP: '+52 55 8899 7766',
            ACOMPAÑANTES: 3,
            ESTATUS: 'Confirmado',
            OBSERVACIONES: 'Llega desde Monterrey',
            EMAIL: 'ignorar@correo.com', // Campo antiguo eliminado debe ser ignorado sin corromper
            FAMILIA: 'Gutiérrez'
          },
          {
            NOMBRE: 'FilaIncompleta',
            APELLIDO: '', // Falta apellido -> debe reportar error en esta fila pero importar la válida
            WHATSAPP: '+52 55 0000 0000'
          }
        ]
      }
    });

    assert.strictEqual(importRes.status, 200);
    assert.strictEqual(importRes.data.insertedCount, 1);
    assert.strictEqual(importRes.data.errors.length, 1);
  });

  test('10. Reuniones: Solicitud de Novios, contrapropuesta de 2 horarios por Equipo y aceptación', async () => {
    // Novios A solicita reunión
    const reqMtg = await makeRequest('/api/weddings/wed_sofia_alejandro/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${noviosAToken}` },
      body: {
        title: 'Revisión de flores y centros de mesa',
        date: '2026-10-19',
        time: '16:00',
        notes: 'Queremos ver muestras de rosas inglesas'
      }
    });
    assert.strictEqual(reqMtg.status, 201);
    assert.strictEqual(reqMtg.data.meeting.status, 'SOLICITADA');
    const mtgId = reqMtg.data.meeting.id;

    // Coordinadora envía 2 opciones alternativas de horario
    const propRes = await makeRequest(`/api/weddings/wed_sofia_alejandro/meetings/${mtgId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${coordAToken}` },
      body: {
        proposed_slots: [
          { date: '2026-10-20', time: '11:00', note: 'Opción matutina en showroom' },
          { date: '2026-10-21', time: '17:30', note: 'Opción vespertina en estudio VLB' }
        ]
      }
    });
    assert.strictEqual(propRes.status, 200);
    assert.strictEqual(propRes.data.status, 'PROPUESTA');

    // Novios selecciona la opción 2
    const selRes = await makeRequest(`/api/weddings/wed_sofia_alejandro/meetings/${mtgId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${noviosAToken}` },
      body: {
        selected_slot: { date: '2026-10-21', time: '17:30' }
      }
    });
    assert.strictEqual(selRes.status, 200);

    const updatedMtg = db.prepare('SELECT status, date, time FROM meetings WHERE id = ?').get(mtgId) as any;
    assert.strictEqual(updatedMtg.status, 'PROGRAMADA');
    assert.strictEqual(updatedMtg.date, '2026-10-21');
    assert.strictEqual(updatedMtg.time, '17:30');
  });

  test('11. Control de Concurrencia Optimista: Detecta sobrescritura simultánea con 409 Conflict', async () => {
    const conflictRes = await makeRequest('/api/weddings/wed_sofia_alejandro', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${coordAToken}` },
      body: {
        notes: 'Intento con timestamp obsoleto',
        expected_updated_at: '1999-01-01T00:00:00.000Z'
      }
    });
    assert.strictEqual(conflictRes.status, 409, 'Debe devolver 409 Conflict ante timestamp desactualizado');
  });

  test('12. Seguridad de Backups y Bitácora Global: Exclusivo para ADMINISTRADOR', async () => {
    const forbiddenBackup = await makeRequest('/api/admin/backup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${noviosAToken}` }
    });
    assert.strictEqual(forbiddenBackup.status, 403);

    const okBackup = await makeRequest('/api/admin/backup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(okBackup.status, 200);
    assert.strictEqual(okBackup.data.metadata.app, 'LAZO - VLB Studio · Planning');
    assert.ok(okBackup.data.data.weddings.length >= 2);
  });

  test('13. Plantillas Maestras VLB y Clasificación Automática por Excel (Checklist, Civil y Religiosa)', async () => {
    // 1. Novios no puede modificar ni importar plantillas maestras VLB
    const forbiddenImport = await makeRequest('/api/catalogs/templates/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${noviosAToken}` },
      body: { rows: [{ MODULO: 'CIVIL', ACTIVIDAD_O_REQUISITO: 'Intento no autorizado' }] }
    });
    assert.strictEqual(forbiddenImport.status, 403);

    // 2. Admin importa Excel con filas para Checklist (Mes 12), Civil y Religiosa
    const importRes = await makeRequest('/api/catalogs/templates/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        syncToWeddings: true,
        rows: [
          {
            MODULO: 'CHECKLIST',
            ETAPA_O_MES: '12 Meses Antes',
            ACTIVIDAD_O_REQUISITO: 'Actividad Prueba Auditoría Mes 12 VLB',
            RESPONSABLE: 'VLB Studio',
            PRIORIDAD: 'Alta'
          },
          {
            MODULO: 'CIVIL',
            ETAPA_O_MES: 'Requisitos Civil',
            ACTIVIDAD_O_REQUISITO: 'Requisito Civil Auditoría VLB'
          },
          {
            MODULO: 'RELIGIOSA',
            ETAPA_O_MES: 'Requisitos Iglesia',
            ACTIVIDAD_O_REQUISITO: 'Requisito Religioso Auditoría VLB'
          }
        ]
      }
    });
    assert.strictEqual(importRes.status, 200);
    assert.strictEqual(importRes.data.routedChecklist, 1);
    assert.strictEqual(importRes.data.routedCivil, 1);
    assert.strictEqual(importRes.data.routedReligious, 1);
  });
});

