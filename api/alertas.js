export default async function handler(req, res) {
  const baseId = 'appWDkiTsdmgPbDAJ';
  const tableName = 'Normativas';
  const token = process.env.AIRTABLE_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Token no configurado en el servidor' });
  }

  try {
    let allRecords = [];
    let offset = undefined;

    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
      url.searchParams.set('filterByFormula', '{Publicada} = TRUE()');
      url.searchParams.set('sort[0][field]', 'Fecha de publicación');
      url.searchParams.set('sort[0][direction]', 'desc');
      url.searchParams.set('pageSize', '100');
      if (offset) url.searchParams.set('offset', offset);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Airtable respondió ${response.status}: ${errText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset;
    } while (offset);

    const alertas = allRecords.map((r) => ({
      id: r.id,
      titulo: r.fields['Título'] || '',
      descripcion: r.fields['Descripción'] || '',
      tipo: r.fields['Tipo'] || '',
      area: r.fields['Área'] || '',
      fecha: r.fields['Fecha de publicación'] || '',
      queHacer: r.fields['Qué hacer'] || '',
    }));

    // Cache breve en el edge para no machacar la API de Airtable
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ alertas });
  } catch (err) {
    console.error('Error consultando Airtable:', err);
    return res.status(500).json({ error: 'No se pudieron cargar las alertas' });
  }
}
