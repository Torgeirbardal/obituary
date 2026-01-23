import React, { useMemo, useState } from "react";

// Obituary Editor Mockup (extended)
// Current features:
// - Oppdrag-side with filters (søketekst, dato fra/til, vis bare i kø)
// - Table columns: Handling, ID/Navn, Innrykksdato, Status, Opprettet, Sist oppdatert
// - Row actions: Endre, Slett, and (Skap annonse | Gå til annonse)
// - Create/Edit Oppdrag modal with full stamdata (avdøde, seremoni, kunde/pårørende) + innrykksdato
// - Sample data: Kari Nordmann and Ola Hansen prefilled

export default function ObituaryAdminMockup() {
  const [view, setView] = useState("oppdrag"); // oppdrag | editor | annonser | import | statistikk | admin
  const [oppdragList, setOppdragList] = useState(sampleOppdrag());
  const [selectedOppdragId, setSelectedOppdragId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOppdrag, setEditingOppdrag] = useState(null);

  // Kept for future editor work
  const [editorAd, setEditorAd] = useState(defaultAd());

  function openEditorForOppdrag(id) {
    // If the user clicks "Skap annonse", we treat it as: create an annonse on the oppdrag
    // and then open the editor.
    setOppdragList((s) =>
      s.map((o) => {
        if (o.id !== id) return o;
        const exists = Boolean(o.annonse?.exists);
        if (exists) return o;
        return {
          ...o,
          annonse: { ...(o.annonse || {}), exists: true },
          // Keep status as "Under arbeid" in this mock when creating an annonse.
          // (If you want a different status like "Sendt til godkjenning", tell me.)
          status: o.status || "Under arbeid",
          updatedAt: new Date().toISOString(),
        };
      })
    );

    setSelectedOppdragId(id);
    setView("editor");

    const op = oppdragList.find((o) => o.id === id);
    if (op) {
      // Simple prefill: set title to full name; later map to real editor fields
      setEditorAd((prev) => ({
        ...prev,
        title: `${op.avdoede?.fornavn || ""} ${op.avdoede?.etternavn || ""}`.trim(),
      }));
    }
  }

  function createOppdrag(data) {
    const id = "O-" + Math.random().toString(36).slice(2, 9);
    const now = new Date().toISOString();

    const newOp = {
      id,
      status: "Under arbeid",
      createdAt: now,
      updatedAt: now,
      createdBy: "tester",
      ...data,
      // keep a simple annonse flag for button label logic
      annonse: data.annonse ?? { exists: false },
    };

    setOppdragList((s) => [newOp, ...s]);
    setShowCreateModal(false);
  }

  function updateOppdrag(id, updates) {
    setOppdragList((s) =>
      s.map((o) => (o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o))
    );
    setEditingOppdrag(null);
  }

  function deleteOppdrag(id) {
    setOppdragList((s) => s.filter((o) => o.id !== id));

    // If you delete the one currently open in editor, bounce back.
    if (selectedOppdragId === id) {
      setSelectedOppdragId(null);
      setView("oppdrag");
    }
  }

  const selectedOppdrag = oppdragList.find((o) => o.id === selectedOppdragId) || null;

  return (
    <div className="h-screen flex bg-gray-50 text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-4 flex flex-col">
        <h2 className="font-bold text-lg mb-4">Dødsannonser - Mockup</h2>
        <nav className="flex-1">
          <MenuItem label="Forside" active={view === "forside"} onClick={() => setView("forside")} />
          <MenuItem label="Oppdrag" active={view === "oppdrag"} onClick={() => setView("oppdrag")} />
          <MenuItem label="Annonser" active={view === "annonser"} onClick={() => setView("annonser")} />
          <MenuItem label="Importstatus" active={view === "import"} onClick={() => setView("import")} />
          <MenuItem label="Statistikk" active={view === "statistikk"} onClick={() => setView("statistikk")} />
          <MenuItem label="Administrasjon" active={view === "admin"} onClick={() => setView("admin")} />
        </nav>
        <div className="mt-4">
          <button className="w-full bg-slate-800 text-white py-2 rounded" onClick={() => setShowCreateModal(true)}>
            Opprett oppdrag
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 p-6 overflow-auto">
        {view === "oppdrag" && (
          <OppdragView
            oppdragList={oppdragList}
            onOpen={(id) => openEditorForOppdrag(id)}
            onEdit={(op) => setEditingOppdrag(op)}
            onDelete={(id) => deleteOppdrag(id)}
          />
        )}

        {view === "editor" && (
          <EditorView oppdrag={selectedOppdrag} ad={editorAd} setAd={setEditorAd} onBack={() => setView("oppdrag")} />
        )}

        {view === "annonser" && <Placeholder title="Annonser" />}
        {view === "import" && <Placeholder title="Importstatus" />}
        {view === "statistikk" && <Placeholder title="Statistikk" />}
        {view === "admin" && <Placeholder title="Administrasjon" />}
        {view === "forside" && <Placeholder title="Forside" />}
      </main>

      {showCreateModal && <CreateEditOppdragModal onClose={() => setShowCreateModal(false)} onSave={createOppdrag} />}

      {editingOppdrag && (
        <CreateEditOppdragModal
          oppdrag={editingOppdrag}
          onClose={() => setEditingOppdrag(null)}
          onSave={(data) => updateOppdrag(editingOppdrag.id, data)}
        />
      )}
    </div>
  );
}

function MenuItem({ label, active, onClick }) {
  return (
    <button
      className={`flex items-center gap-2 w-full p-2 rounded ${active ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
      onClick={onClick}
    >
      <span className="w-2 h-2 rounded-full bg-slate-400" />
      <span>{label}</span>
    </button>
  );
}

function OppdragView({ oppdragList, onOpen, onEdit, onDelete }) {
  // Filters similar to bilde 2 (without 'Avis')
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyInQueue, setOnlyInQueue] = useState(false);

  const filtered = useMemo(() => {
    return oppdragList.filter((o) => {
      // søk på id eller navn
      if (searchText) {
        const text = searchText.toLowerCase().trim();
        const haystack = `${o.id} ${o.avdoede?.fornavn || ""} ${o.avdoede?.mellomnavn || ""} ${o.avdoede?.etternavn || ""}`
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
        if (!haystack.includes(text)) return false;
      }

      // kø
      if (onlyInQueue) {
        if (o.status !== "Under arbeid" && o.status !== "I kø") return false;
      }

      // dato-filter (innrykksdato)
      const d = o.innrykksdato ? new Date(o.innrykksdato) : null;
      if (dateFrom && d) {
        const df = new Date(dateFrom);
        if (d < df) return false;
      }
      if (dateTo && d) {
        const dt = new Date(dateTo);
        if (d > dt) return false;
      }

      return true;
    });
  }, [oppdragList, searchText, dateFrom, dateTo, onlyInQueue]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold">Oppdrag</h3>
        <div className="text-sm text-slate-600">
          Viser {filtered.length} av {oppdragList.length} oppdrag
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded p-4 mb-4">
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-5">
            <label className="text-sm block">Søketekst:</label>
            <input
              className="w-full border p-2 rounded mt-1 text-sm"
              placeholder="Søk etter id eller navn"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="col-span-3">
            <label className="text-sm block">Dato fra:</label>
            <input type="date" className="w-full border p-2 rounded mt-1 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="text-sm block">Dato til:</label>
            <input type="date" className="w-full border p-2 rounded mt-1 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="col-span-1 text-right">
            <label className="inline-flex items-center text-sm">
              <input type="checkbox" className="mr-2" checked={onlyInQueue} onChange={(e) => setOnlyInQueue(e.target.checked)} />
              <span>Vis bare i kø</span>
            </label>
          </div>

          <div className="col-span-12 text-right mt-2">
            <button className="px-3 py-1 bg-slate-800 text-white rounded mr-2" onClick={() => {}}>
              Søk
            </button>
            <button
              className="px-3 py-1 border rounded"
              onClick={() => {
                setSearchText("");
                setDateFrom("");
                setDateTo("");
                setOnlyInQueue(false);
              }}
            >
              Fjern satte filter
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Handling</th>
              <th className="p-3 text-left">ID / Navn</th>
              <th className="p-3">Innrykksdato</th>
              <th className="p-3">Status</th>
              <th className="p-3">Opprettet</th>
              <th className="p-3">Sist oppdatert</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const primaryLabel = getPrimaryLabel(o);

              return (
                <tr key={o.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="px-3 py-1 border rounded text-sm" onClick={() => onEdit(o)}>
                        Endre
                      </button>
                      <button
                        className="px-3 py-1 border rounded text-sm text-red-600"
                        onClick={() => {
                          if (confirm("Slett oppdrag?")) onDelete(o.id);
                        }}
                      >
                        Slett
                      </button>
                      <button className="px-3 py-1 border rounded text-sm" onClick={() => onOpen(o.id)}>
                        {primaryLabel}
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">
                      {o.avdoede?.fornavn} {o.avdoede?.mellomnavn ? `${o.avdoede.mellomnavn} ` : ""}
                      {o.avdoede?.etternavn}
                    </div>
                    <div className="text-xs text-slate-500">{o.id}</div>
                  </td>
                  <td className="p-3">{o.innrykksdato ? formatDate(o.innrykksdato) : "-"}</td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3">{formatDate(o.createdAt)}</td>
                  <td className="p-3">{formatDate(o.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditorView({ oppdrag, ad, setAd, onBack }) {
  if (!oppdrag) {
    return (
      <div>
        <button className="mb-4 px-3 py-1 border rounded" onClick={onBack}>
          Tilbake
        </button>
        <p>Ingen oppdrag valgt.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <button className="px-3 py-1 border rounded mr-2" onClick={onBack}>
            Tilbake
          </button>
          <span className="text-lg font-bold">
            Editor — {oppdrag.avdoede?.fornavn} {oppdrag.avdoede?.etternavn}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border rounded">Åpne PDF</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded">Godkjenn</button>
        </div>
      </div>

      {/* Minimal placeholder editor to keep this file focused on Oppdrag-siden */}
      <div className="bg-white border rounded p-4">
        <div className="text-sm text-slate-600 mb-2">Mock editor-tilstand</div>
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-8">
            <label className="text-sm block">Tittel (fra oppdrag)</label>
            <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.title} onChange={(e) => setAd({ ...ad, title: e.target.value })} />
          </div>
          <div className="col-span-4">
            <label className="text-sm block">Symbol</label>
            <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.symbol} onChange={(e) => setAd({ ...ad, symbol: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 text-sm">
          <div className="font-semibold mb-1">Preview</div>
          <div className="border rounded p-4 text-center">
            <div className="mb-2">{ad.symbol}</div>
            <div className="text-lg font-bold">{ad.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateEditOppdragModal({ onClose, onSave, oppdrag }) {
  const editMode = Boolean(oppdrag);

  const [form, setForm] = useState(() => {
    if (oppdrag) return deepClone(oppdrag);

    return {
      innrykksdato: "",
      status: "Under arbeid",
      annonse: { exists: false },
      avdoede: {
        fornavn: "",
        mellomnavn: "",
        etternavn: "",
        visningsnavn: "",
        fodselsdato: "",
        fodselssted: "",
        dodsdato: "",
        bostedVedDod: "",
      },
      seremoni: {
        type: "",
        dato: "",
        sted: "",
        privat: false,
      },
      kunde: {
        navn: "",
        etternavn: "",
        epost: "",
        telefon: "",
      },
    };
  });
  const [errors, setErrors] = useState({});

  function isBlank(value) {
    return !value || String(value).trim() === "";
  }

  function handleAvdoedeField(field, value) {
    const next = {
      ...form,
      avdoede: {
        ...form.avdoede,
        [field]: value,
      },
    };

    // Auto-fill visningsnavn only in create mode (but still editable)
    if (!editMode && (field === "fornavn" || field === "mellomnavn" || field === "etternavn")) {
      const v = `${next.avdoede.fornavn} ${next.avdoede.mellomnavn ? next.avdoede.mellomnavn + " " : ""}${next.avdoede.etternavn}`
        .replace(/\s+/g, " ")
        .trim();
      next.avdoede.visningsnavn = v;
    }

    setForm(next);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function handleSubmit() {
    if (!editMode) {
      const nextErrors = {};
      if (isBlank(form.avdoede.fornavn)) nextErrors.fornavn = "Fornavn er påkrevd.";
      if (isBlank(form.avdoede.etternavn)) nextErrors.etternavn = "Etternavn er påkrevd.";
      if (isBlank(form.seremoni.type)) nextErrors.seremoniType = "Seremonitype er påkrevd.";

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }
    }

    setErrors({});
    onSave(form);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-3/4 max-w-4xl p-6 overflow-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{editMode ? "Endre oppdrag" : "Opprett nytt oppdrag"}</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>
            Lukk
          </button>
        </div>

        {errors.fornavn || errors.etternavn || errors.seremoniType ? (
          <div className="mb-3 text-sm text-red-600">Fyll ut påkrevde felter før du oppretter oppdrag.</div>
        ) : null}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6">
            <h4 className="font-semibold mb-2">Avdøde</h4>

            <label className="text-sm">
              Fornavn <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full border p-2 rounded mt-1 ${errors.fornavn ? "border-red-500" : ""}`}
              value={form.avdoede.fornavn}
              onChange={(e) => handleAvdoedeField("fornavn", e.target.value)}
            />
            {errors.fornavn ? <div className="text-xs text-red-600 mt-1">{errors.fornavn}</div> : null}

            <label className="text-sm mt-2">Mellomnavn</label>
            <input className="w-full border p-2 rounded mt-1" value={form.avdoede.mellomnavn} onChange={(e) => handleAvdoedeField("mellomnavn", e.target.value)} />

            <label className="text-sm mt-2">
              Etternavn <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full border p-2 rounded mt-1 ${errors.etternavn ? "border-red-500" : ""}`}
              value={form.avdoede.etternavn}
              onChange={(e) => handleAvdoedeField("etternavn", e.target.value)}
            />
            {errors.etternavn ? <div className="text-xs text-red-600 mt-1">{errors.etternavn}</div> : null}

            <label className="text-sm mt-2">Visningsnavn</label>
            <input className="w-full border p-2 rounded mt-1" value={form.avdoede.visningsnavn} onChange={(e) => handleAvdoedeField("visningsnavn", e.target.value)} />

            <label className="text-sm mt-2">Fødselsdato</label>
            <input type="date" className="w-full border p-2 rounded mt-1" value={form.avdoede.fodselsdato || ""} onChange={(e) => handleAvdoedeField("fodselsdato", e.target.value)} />

            <label className="text-sm mt-2">Fødested</label>
            <input className="w-full border p-2 rounded mt-1" value={form.avdoede.fodselssted} onChange={(e) => handleAvdoedeField("fodselssted", e.target.value)} />

            <label className="text-sm mt-2">Dødsdato</label>
            <input type="date" className="w-full border p-2 rounded mt-1" value={form.avdoede.dodsdato || ""} onChange={(e) => handleAvdoedeField("dodsdato", e.target.value)} />

            <label className="text-sm mt-2">Bosted ved dødsdato</label>
            <input className="w-full border p-2 rounded mt-1" value={form.avdoede.bostedVedDod} onChange={(e) => handleAvdoedeField("bostedVedDod", e.target.value)} />
          </div>

          <div className="col-span-6">
            <h4 className="font-semibold mb-2">Seremoni</h4>

            <label className="text-sm">
              Seremonitype <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full border p-2 rounded mt-1 ${errors.seremoniType ? "border-red-500" : ""}`}
              placeholder="F.eks. Begravelse"
              value={form.seremoni.type}
              onChange={(e) => {
                setForm({ ...form, seremoni: { ...form.seremoni, type: e.target.value } });
                if (errors.seremoniType) {
                  setErrors((prev) => ({ ...prev, seremoniType: "" }));
                }
              }}
            />
            {errors.seremoniType ? <div className="text-xs text-red-600 mt-1">{errors.seremoniType}</div> : null}

            <label className="text-sm mt-2">Seremonidato</label>
            <input type="date" className="w-full border p-2 rounded mt-1" value={form.seremoni.dato || ""} onChange={(e) => setForm({ ...form, seremoni: { ...form.seremoni, dato: e.target.value } })} />

            <label className="text-sm mt-2">Seremonisted</label>
            <input
              className="w-full border p-2 rounded mt-1"
              placeholder="Søk sted (Google-lookup stub)"
              value={form.seremoni.sted}
              onChange={(e) => setForm({ ...form, seremoni: { ...form.seremoni, sted: e.target.value } })}
            />

            <label className="inline-flex items-center mt-3">
              <input type="checkbox" className="mr-2" checked={form.seremoni.privat} onChange={(e) => setForm({ ...form, seremoni: { ...form.seremoni, privat: e.target.checked } })} />
              Privat seremoni
            </label>

            <h4 className="font-semibold mt-4 mb-2">Kunde / Pårørende</h4>

            <label className="text-sm">Navn</label>
            <input className="w-full border p-2 rounded mt-1" value={form.kunde.navn} onChange={(e) => setForm({ ...form, kunde: { ...form.kunde, navn: e.target.value } })} />

            <label className="text-sm mt-2">Etternavn</label>
            <input className="w-full border p-2 rounded mt-1" value={form.kunde.etternavn} onChange={(e) => setForm({ ...form, kunde: { ...form.kunde, etternavn: e.target.value } })} />

            <label className="text-sm mt-2">E-post</label>
            <input className="w-full border p-2 rounded mt-1" value={form.kunde.epost} onChange={(e) => setForm({ ...form, kunde: { ...form.kunde, epost: e.target.value } })} />

            <label className="text-sm mt-2">Telefon</label>
            <input className="w-full border p-2 rounded mt-1" value={form.kunde.telefon} onChange={(e) => setForm({ ...form, kunde: { ...form.kunde, telefon: e.target.value } })} />

            <label className="text-sm mt-3">Innrykksdato</label>
            <input type="date" className="w-full border p-2 rounded mt-1" value={form.innrykksdato || ""} onChange={(e) => setForm({ ...form, innrykksdato: e.target.value })} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onClose}>
            Avbryt
          </button>
          <button className="px-3 py-1 bg-slate-800 text-white rounded" onClick={handleSubmit}>
            {editMode ? "Lagre endringer" : "Opprett"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ title }) {
  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <div className="bg-white border p-6 rounded">Innhold kommer</div>
    </div>
  );
}

// --- Helpers & sample data ---
function sampleOppdrag() {
  const now = new Date().toISOString();

  return [
    {
      id: "O-1a2b3c",
      status: "Levert/Godkjent",
      createdAt: now,
      updatedAt: now,
      createdBy: "tester",
      innrykksdato: "2025-12-28",
      avdoede: {
        fornavn: "Kari",
        mellomnavn: "",
        etternavn: "Nordmann",
        visningsnavn: "Kari Nordmann",
        fodselsdato: "1946-04-05",
        fodselssted: "Trondheim",
        dodsdato: "2025-12-23",
        bostedVedDod: "Trondheim",
      },
      seremoni: {
        type: "Begravelse",
        dato: "2025-12-30",
        sted: "Trondheim domkirke",
        privat: false,
      },
      kunde: {
        navn: "Marit",
        etternavn: "Nordmann",
        epost: "marit@example.com",
        telefon: "90000000",
        kundenummer: "CROSS-123",
      },
      annonse: { exists: true },
    },
    {
      id: "O-9x8y7z",
      status: "Under arbeid",
      createdAt: now,
      updatedAt: now,
      createdBy: "tester",
      innrykksdato: "",
      avdoede: {
        fornavn: "Ola",
        mellomnavn: "",
        etternavn: "Hansen",
        visningsnavn: "Ola Hansen",
        fodselsdato: "1952-02-11",
        fodselssted: "Steinkjer",
        dodsdato: "2025-11-10",
        bostedVedDod: "Steinkjer",
      },
      seremoni: {
        type: "Begravelse",
        dato: "",
        sted: "",
        privat: true,
      },
      kunde: {
        navn: "Frank",
        etternavn: "Hansen",
        epost: "frank@example.com",
        telefon: "91111111",
        kundenummer: "",
      },
      annonse: { exists: false },
    },
  ];
}

function defaultAd() {
  return {
    symbol: "✝",
    title: "",
  };
}

function formatDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("no-NB");
  } catch {
    return String(iso);
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getPrimaryLabel(oppdrag) {
  const hasAnnonce = Boolean(oppdrag?.annonse?.exists) || oppdrag?.status === "Levert/Godkjent" || oppdrag?.status === "Sendt til godkjenning";
  return hasAnnonce ? "Gå til annonse" : "Skap annonse";
}

// --- Lightweight self-tests (no external test runner required) ---
// These run once in the browser during development. They validate key assumptions.
(function runSelfTestsOnce() {
  try {
    if (typeof window === "undefined") return;
    if (window.__obituaryMockupSelfTestRan) return;
    window.__obituaryMockupSelfTestRan = true;

    const ops = sampleOppdrag();
    assert(ops.length === 2, "Expected sampleOppdrag to return 2 oppdrag");
    assert(ops[0].avdoede.fornavn === "Kari" && ops[0].avdoede.etternavn === "Nordmann", "Expected first oppdrag to be Kari Nordmann");
    assert(ops[1].avdoede.fornavn === "Ola" && ops[1].avdoede.etternavn === "Hansen", "Expected second oppdrag to be Ola Hansen");

    const d = formatDate("2025-12-28");
    assert(typeof d === "string" && d.length > 0, "Expected formatDate to return a non-empty string");

    const label1 = getPrimaryLabel(ops[0]);
    const label2 = getPrimaryLabel(ops[1]);

    // simulate "Skap annonse" action: mark annonse.exists=true
    const olaAfter = { ...ops[1], annonse: { ...(ops[1].annonse || {}), exists: true } };
    assert(getPrimaryLabel(olaAfter) === "Gå til annonse", "Expected Ola label to switch to 'Gå til annonse' after creating annonse");
    assert(label1 === "Gå til annonse", "Expected Kari to have label 'Gå til annonse'");
    assert(label2 === "Skap annonse", "Expected Ola to have label 'Skap annonse'");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Self-test failed:", e);
  }
})();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
