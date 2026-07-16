import type { Presupuesto, Llamada } from "./crm";

// Solo los campos que el propio cliente ya nos dio al tarificar, en el
// mismo formato que usa el área de cliente (QuoteProfile) — así el frontend
// los usa sin transformar. No incluye notas del agente ni quién lo cerró.
export function presupuestoToClientQuote(p: Presupuesto) {
  const d = p.data ?? {};
  return {
    id: p.id,
    producto: p.producto,
    createdAt: p.createdAt,
    codigoPostal: d.codigoPostal,
    numAsegurados: d.numAsegurados,
    coberturaDental: d.coberturaDental,
    fechaNacimiento: d.fechaNacimiento,
    sexo: d.sexo,
    motivo: d.motivo,
    fumador: d.fumador,
    inicio: d.inicio,
    tipoVehiculo: d.tipoVehiculo,
    matricula: d.matricula,
    marcaVehiculo: d.marcaVehiculo,
    modeloVehiculo: d.modeloVehiculo,
    anioVehiculo: d.anioVehiculo,
    usoVehiculo: d.usoVehiculo,
    antiguedadCarnet: d.antiguedadCarnet,
    coberturaDeseada: d.coberturaDeseada,
    nombre: p.nombre,
    telefono: p.telefono,
    email: p.email,
  };
}

// Solo lo que le concierne al cliente sobre una llamada que solicitó: ni
// notas internas del agente ni su nombre — solo estado y cuándo es.
export function llamadaToClientView(l: Llamada) {
  return {
    id: l.id,
    producto: l.producto,
    status: l.status,
    presupuestoId: l.presupuestoId,
    diaLlamada: l.diaLlamada,
    turnoLlamada: l.turnoLlamada,
    fechaProgramada: l.fechaProgramada,
    horaProgramada: l.horaProgramada,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}
