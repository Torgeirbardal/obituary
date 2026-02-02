import React, { useEffect, useMemo, useState } from "react";

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
  const [annonseList, setAnnonceList] = useState(sampleAnnonser());
  const [importLogs, setImportLogs] = useState(sampleImportLogs());
  const [selectedOppdragId, setSelectedOppdragId] = useState(null);
  const [selectedAnnonceId, setSelectedAnnonceId] = useState(null);
  const [selectedImportId, setSelectedImportId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAnnonceModal, setShowCreateAnnonceModal] = useState(false);
  const [editingAnnonceDate, setEditingAnnonceDate] = useState(null);
  const [editingOppdrag, setEditingOppdrag] = useState(null);
  const currentUser = "torgeir.roness";
  const [suggestionBank, setSuggestionBank] = useState(defaultSuggestionBank());

  // Kept for future editor work
  const [editorAd, setEditorAd] = useState(defaultAd());

  function openEditorForOppdrag(id, annonceId) {
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
    if (annonceId) {
      setSelectedAnnonceId(annonceId);
    } else {
      const relatedAnnonce = annonceList.find((a) => a.oppdragId === id);
      setSelectedAnnonceId(relatedAnnonce ? relatedAnnonce.id : null);
    }
    setView("editor");

    const op = oppdragList.find((o) => o.id === id);
    if (op) {
      const fullName = `${op.avdoede?.fornavn || ""} ${op.avdoede?.mellomnavn ? op.avdoede.mellomnavn + " " : ""}${op.avdoede?.etternavn || ""}`
        .replace(/\s+/g, " ")
        .trim();
      setEditorAd((prev) => ({
        ...prev,
        title: prev.title || "",
        firstName: op.avdoede?.fornavn || "",
        middleName: op.avdoede?.mellomnavn || "",
        lastName: op.avdoede?.etternavn || "",
        birthDate: op.avdoede?.fodselsdato || prev.birthDate || "",
        deathDate: prev.deathDate || "",
        deathPlace: prev.deathPlace || "",
        takkName: prev.takkName || fullName,
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

  function createAnnonceFromOppdrag(oppdragId) {
    if (!oppdragId) return;
    const op = oppdragList.find((o) => o.id === oppdragId);
    if (!op) return;
    const existing = annonseList.find((a) => a.oppdragId === oppdragId);
    if (existing) {
      setSelectedAnnonceId(existing.id);
      return existing.id;
    }
    const now = new Date().toISOString();
    const id = "A-" + Math.random().toString(36).slice(2, 9);
    const navn = `${op.avdoede?.fornavn || ""} ${op.avdoede?.mellomnavn ? op.avdoede.mellomnavn + " " : ""}${op.avdoede?.etternavn || ""}`
      .replace(/\s+/g, " ")
      .trim();

    const newAnnonce = {
      id,
      leverandor: "Oppdrag",
      type: "Død",
      navn,
      publisering: op.innrykksdato || now,
      opprettet: now,
      endret: now,
      publikasjon: op.avis || "Ikke satt",
      status: "I kø",
      oppdragId,
      produsent: currentUser,
    };

    setAnnonceList((s) => [newAnnonce, ...s]);
    setOppdragList((s) =>
      s.map((o) =>
        o.id === oppdragId
          ? {
              ...o,
              annonse: { ...(o.annonse || {}), exists: true },
              status: o.status || "Under arbeid",
              updatedAt: now,
            }
          : o
      )
    );
    setSelectedAnnonceId(id);
    setShowCreateAnnonceModal(false);
    return id;
  }

  function openEditorWithOppdrag(op, annonceId) {
    const fullName = `${op.avdoede?.fornavn || ""} ${op.avdoede?.mellomnavn ? op.avdoede.mellomnavn + " " : ""}${op.avdoede?.etternavn || ""}`
      .replace(/\s+/g, " ")
      .trim();
    setSelectedOppdragId(op.id);
    if (annonceId) {
      setSelectedAnnonceId(annonceId);
    }
    setView("editor");
    setEditorAd((prev) => ({
      ...prev,
      title: prev.title || "",
      firstName: op.avdoede?.fornavn || "",
      middleName: op.avdoede?.mellomnavn || "",
      lastName: op.avdoede?.etternavn || "",
      birthDate: op.avdoede?.fodselsdato || prev.birthDate || "",
      takkName: prev.takkName || fullName,
    }));
  }

  function handleOppdragPrimaryAction(op) {
    const annonceId = createAnnonceFromOppdrag(op.id);
    openEditorWithOppdrag(op, annonceId);
  }

  function approveAnnonce(id) {
    setAnnonceList((s) =>
      s.map((a) => (a.id === id ? { ...a, status: "Godkjent", endret: new Date().toISOString() } : a))
    );
  }

  function openEditorForAnnonce(annonce) {
    if (!annonce.oppdragId) {
      alert("Denne annonsen har ikke et oppdrag knyttet til seg ennå.");
      return;
    }
    const op = oppdragList.find((o) => o.id === annonce.oppdragId);
    if (op) {
      openEditorWithOppdrag(op, annonce.id);
    } else {
      setSelectedAnnonceId(annonce.id);
      openEditorForOppdrag(annonce.oppdragId);
    }
  }

  function updatePublisering(annonceId, dato) {
    setAnnonceList((s) =>
      s.map((a) => (a.id === annonceId ? { ...a, publisering: dato, endret: new Date().toISOString() } : a))
    );
    setEditingAnnonceDate(null);
  }

  function markAnnonceSent() {
    if (!selectedAnnonceId) return;
    setAnnonceList((s) =>
      s.map((a) =>
        a.id === selectedAnnonceId ? { ...a, status: "Sendt til godkjenning", endret: new Date().toISOString() } : a
      )
    );
  }

  function addSuggestion(field, text) {
    const cleaned = (text || "").trim();
    if (!cleaned) return;
    setSuggestionBank((prev) => {
      const list = prev[field] || [];
      const existing = list.find((i) => i.text.toLowerCase() === cleaned.toLowerCase());
      if (existing) {
        return {
          ...prev,
          [field]: list.map((i) => (i.text.toLowerCase() === cleaned.toLowerCase() ? { ...i, count: i.count + 1 } : i)),
        };
      }
      return {
        ...prev,
        [field]: [...list, { text: cleaned, count: 1 }],
      };
    });
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
        <div className="mt-4" />
      </aside>

      {/* Main area */}
      <main className="flex-1 p-6 overflow-auto">
        {view === "oppdrag" && (
          <OppdragView
            oppdragList={oppdragList}
            onOpen={(op) => handleOppdragPrimaryAction(op)}
            onEdit={(op) => setEditingOppdrag(op)}
            onDelete={(id) => deleteOppdrag(id)}
            onCreate={() => setShowCreateModal(true)}
          />
        )}

        {view === "editor" && (
          <EditorView
            oppdrag={selectedOppdrag}
            ad={editorAd}
            setAd={setEditorAd}
            onBack={() => setView("oppdrag")}
            onDone={() => {
              markAnnonceSent();
              setView("annonser");
            }}
            suggestionBank={suggestionBank}
            onAddSuggestion={addSuggestion}
            approvalMode={getSelectedAnnonceStatus(annonseList, selectedAnnonceId) === "Sendt til godkjenning"}
            initialStep={getSelectedAnnonceStatus(annonseList, selectedAnnonceId) === "Sendt til godkjenning" ? 4 : 1}
            rejectComment={getSelectedAnnonce(annonseList, selectedAnnonceId)?.rejectComment || ""}
            onApproveOrder={() => {
              setAnnonceList((s) =>
                s.map((a) => (a.id === selectedAnnonceId ? { ...a, status: "Godkjent", endret: new Date().toISOString() } : a))
              );
              setView("annonser");
            }}
            onRejectOrder={(comment) => {
              setAnnonceList((s) =>
                s.map((a) =>
                  a.id === selectedAnnonceId
                    ? { ...a, status: "Ikke godkjent", endret: new Date().toISOString(), rejectComment: comment }
                    : a
                )
              );
              setView("annonser");
            }}
          />
        )}

        {view === "annonser" && (
          <AnnonserView
            annonseList={annonseList}
            onCreate={() => setShowCreateAnnonceModal(true)}
            onApprove={(id) => approveAnnonce(id)}
            onEdit={(annonce) => openEditorForAnnonce(annonce)}
            onEditDate={(annonce) => setEditingAnnonceDate(annonce)}
          />
        )}
        {view === "import" && (
          <ImportStatusView
            logs={importLogs}
            selectedId={selectedImportId}
            onSelect={(id) => setSelectedImportId((s) => (s === id ? null : id))}
          />
        )}
        {view === "statistikk" && <StatistikkView annonseList={annonseList} importLogs={importLogs} />}
        {view === "admin" && <Placeholder title="Administrasjon" contentClass="font-semibold" />}
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

      {showCreateAnnonceModal && (
        <CreateAnnonceFromOppdragModal
          oppdragList={oppdragList}
          onClose={() => setShowCreateAnnonceModal(false)}
          onConfirm={(oppdragId) => {
            const annonceId = createAnnonceFromOppdrag(oppdragId);
            openEditorForOppdrag(oppdragId, annonceId);
          }}
        />
      )}

      {editingAnnonceDate && (
        <ChangePubliseringModal
          annonse={editingAnnonceDate}
          onClose={() => setEditingAnnonceDate(null)}
          onSave={(dato) => updatePublisering(editingAnnonceDate.id, dato)}
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

function OppdragView({ oppdragList, onOpen, onEdit, onDelete, onCreate }) {
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
        <div>
          <h3 className="text-2xl font-bold">Oppdrag</h3>
          <div className="text-sm text-slate-600">
            Viser {filtered.length} av {oppdragList.length} oppdrag
          </div>
        </div>
        <button className="px-4 py-2 bg-slate-800 text-white rounded" onClick={onCreate}>
          Opprett oppdrag
        </button>
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
                      <button className="px-3 py-1 border rounded text-sm" onClick={() => onOpen(o)}>
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

function AnnonserView({ annonseList, onCreate, onApprove, onEdit, onEditDate }) {
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [publication, setPublication] = useState("Alle");
  const [annonseType, setAnnonceType] = useState("Alle");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [nearDeadlineOnly, setNearDeadlineOnly] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const publications = useMemo(() => getPublications(annonseList), [annonseList]);

  const filtered = useMemo(() => {
    return annonseList.filter((a) => {
      if (searchText) {
        const text = searchText.toLowerCase().trim();
        const haystack = `${a.id} ${a.navn} ${a.leverandor}`.toLowerCase();
        if (!haystack.includes(text)) return false;
      }

      const d = a.publisering ? new Date(a.publisering) : null;
      if (dateFrom && d) {
        const df = new Date(dateFrom);
        if (d < df) return false;
      }
      if (dateTo && d) {
        const dt = new Date(dateTo);
        if (d > dt) return false;
      }

      if (publication !== "Alle" && a.publikasjon !== publication) return false;
      if (annonseType !== "Alle" && a.type !== annonseType) return false;
      if (statusFilter !== "Alle" && a.status !== statusFilter) return false;

      if (nearDeadlineOnly) {
        const today = startOfDay(new Date());
        const start = addBusinessDays(today, 1);
        const cutoff = addBusinessDays(today, 2);
        const publishDate = a.publisering ? startOfDay(new Date(a.publisering)) : null;
        if (!publishDate) return false;
        if (publishDate < start || publishDate > cutoff) return false;
      }

      return true;
    });
  }, [annonseList, searchText, dateFrom, dateTo, publication, annonseType, statusFilter, nearDeadlineOnly]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold">Annonser</h3>
          <div className="text-sm text-slate-600">
            Viser {filtered.length} av {annonseList.length} annonser
          </div>
        </div>
        <button className="px-4 py-2 bg-slate-800 text-white rounded" onClick={onCreate}>
          Opprett annonse
        </button>
      </div>

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

          <div className="col-span-3">
            <label className="text-sm block">Avis:</label>
            <select className="w-full border p-2 rounded mt-1 text-sm" value={publication} onChange={(e) => setPublication(e.target.value)}>
              {publications.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-sm block">Type:</label>
            <select className="w-full border p-2 rounded mt-1 text-sm" value={annonseType} onChange={(e) => setAnnonceType(e.target.value)}>
              <option value="Alle">Alle</option>
              <option value="Død">Død</option>
              <option value="Takk">Takk</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-sm block">Status:</label>
            <select className="w-full border p-2 rounded mt-1 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="Alle">Alle</option>
              <option value="I kø">I kø</option>
              <option value="Sendt til godkjenning">Sendt til godkjenning</option>
              <option value="Godkjent">Godkjent</option>
              <option value="Ikke godkjent">Ikke godkjent</option>
            </select>
          </div>

          <div className="col-span-12 mt-2">
            <label className="inline-flex items-center text-sm">
              <input type="checkbox" className="mr-2" checked={nearDeadlineOnly} onChange={(e) => setNearDeadlineOnly(e.target.checked)} />
              <span>Vis bare annonser som er nær bestillingsfrist</span>
            </label>
          </div>

          <div className="col-span-12 text-right mt-2">
            <button className="px-3 py-1 bg-slate-800 text-white rounded mr-2" onClick={() => {}}>
              Søk i annonser
            </button>
            <button
              className="px-3 py-1 border rounded"
              onClick={() => {
                setSearchText("");
                setDateFrom("");
                setDateTo("");
                setPublication("Alle");
                setAnnonceType("Alle");
                setStatusFilter("Alle");
                setNearDeadlineOnly(false);
              }}
            >
              Fjern satte filter
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Leverandør</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Navn</th>
              <th className="p-3">Publisering</th>
              <th className="p-3">Opprettet</th>
              <th className="p-3">Endret</th>
              <th className="p-3">Publikasjon</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => onEdit(a)}>
                <td className="p-3">{a.id}</td>
                <td className="p-3">{a.leverandor}</td>
                <td className="p-3">{a.type}</td>
                <td className="p-3">{a.navn}</td>
                <td className="p-3">{formatDateTime(a.publisering)}</td>
                <td className="p-3">{formatDateTime(a.opprettet)}</td>
                <td className="p-3">{formatDateTime(a.endret)}</td>
                <td className="p-3">{a.publikasjon}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${statusClass(a.status)}`}
                    title={a.status === "Ikke godkjent" && a.rejectComment ? a.rejectComment : ""}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="relative inline-block text-left">
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === a.id ? null : a.id);
                      }}
                    >
                      ...
                    </button>
                    {openMenuId === a.id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-10">
                        <button
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            onApprove(a.id);
                          }}
                        >
                          Godkjenn
                        </button>
                        <button
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            onEdit(a);
                          }}
                        >
                          Rediger
                        </button>
                        <button
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            onEditDate(a);
                          }}
                        >
                          Endre pub.dato
                        </button>
                        <button
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            alert("PDF lastes ned (mock).");
                          }}
                        >
                          Last ned PDF
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportStatusView({ logs, selectedId, onSelect }) {
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (searchText) {
        const text = searchText.toLowerCase().trim();
        const inFile = (log.fileUrl || "").toLowerCase().includes(text);
        const inId = log.items?.some((i) => String(i.adId).toLowerCase().includes(text));
        if (!inFile && !inId) return false;
      }

      const d = log.timestamp ? new Date(log.timestamp) : null;
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
  }, [logs, searchText, dateFrom, dateTo]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold">Importstatus</h3>
      </div>

      <div className="bg-white border rounded p-4 mb-4">
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-6">
            <label className="text-sm block">Søketekst:</label>
            <input
              className="w-full border p-2 rounded mt-1 text-sm"
              placeholder="Søk etter annonse-ID eller logg-navn"
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

          <div className="col-span-12 text-right mt-2">
            <button className="px-3 py-1 bg-slate-800 text-white rounded mr-2" onClick={() => {}}>
              Søk i importlogger
            </button>
            <button
              className="px-3 py-1 border rounded"
              onClick={() => {
                setSearchText("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Fjern satte filter
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mb-4">
        <div className="inline-flex border rounded overflow-hidden text-sm">
          <button className="px-3 py-1 border-r text-slate-400" disabled>
            &laquo;
          </button>
          <button className="px-3 py-1 border-r text-slate-400" disabled>
            &lsaquo;
          </button>
          <button className="px-3 py-1 border-r bg-slate-100 font-semibold">1</button>
          <button className="px-3 py-1 border-r">2</button>
          <button className="px-3 py-1 border-r">3</button>
          <button className="px-3 py-1 border-r">4</button>
          <button className="px-3 py-1 border-r">5</button>
          <button className="px-3 py-1 border-r">&rsaquo;</button>
          <button className="px-3 py-1">&raquo;</button>
        </div>
      </div>

      <div className="bg-white border rounded shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Tidspunkt</th>
              <th className="p-3 text-left">Fil/Url</th>
              <th className="p-3">Status</th>
              <th className="p-3">Antall annonser</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <React.Fragment key={log.id}>
                <tr className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => onSelect(log.id)}>
                  <td className="p-3">{formatDateTime(log.timestamp)}</td>
                  <td className="p-3">
                    <div className="truncate max-w-[360px]">{log.fileUrl}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusClass(log.status)}`}>{log.status}</span>
                  </td>
                  <td className="p-3 text-center">{log.count}</td>
                </tr>
                {selectedId === log.id && (
                  <tr className="border-t bg-slate-50">
                    <td colSpan={4} className="p-4">
                      <div className="bg-white border rounded">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="p-3 text-left">Annonse ID</th>
                              <th className="p-3 text-left">Type</th>
                              <th className="p-3 text-left">Navn</th>
                              <th className="p-3 text-left">Webpublisering</th>
                            </tr>
                          </thead>
                          <tbody>
                            {log.items.map((item) => (
                              <tr key={item.adId} className="border-t">
                                <td className="p-3">{item.adId}</td>
                                <td className="p-3">{item.type}</td>
                                <td className="p-3">{item.name}</td>
                                <td className="p-3">{formatDateTime(item.webPublisering)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatistikkView({ annonseList, importLogs }) {
  const [preset, setPreset] = useState("Siste 30 dager");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const now = new Date();
  const { fromDate, toDate, label } = getPresetRange(preset, customFrom, customTo);
  const filteredAds = filterByDateRange(annonseList, fromDate, toDate);
  const statsRange = filteredAds.length;
  const typeCounts = countBy(filteredAds, (a) => a.type || "Ukjent");
  const supplierCounts = countBy(filteredAds, (a) => a.leverandor || "Ukjent");
  const statusCounts = countBy(filteredAds, (a) => a.status || "Ukjent");
  const topPublications = topN(countBy(filteredAds, (a) => a.publikasjon || "Ukjent"), 5);
  const nearDeadlineNotApproved = annonseList.filter(
    (a) => isWithinBusinessDays(a.publisering, 1, 2) && a.status !== "Godkjent"
  ).length;
  const importCount = importLogs.reduce((acc, l) => acc + (l.count || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold">Statistikk</h3>
        <div className="flex items-center gap-3">
          <select className="border p-2 rounded text-sm" value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option>Denne uken</option>
            <option>Denne måneden</option>
            <option>Dette året</option>
            <option>Siste uke</option>
            <option>Siste 30 dager</option>
            <option>Siste år</option>
            <option>Egendefinert</option>
          </select>
          {preset === "Egendefinert" ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="border p-2 rounded text-sm"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                className="border p-2 rounded text-sm"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          ) : null}
          <div className="text-sm text-slate-600">Oppdatert {formatDateTime(now.toISOString())}</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <StatCard title={label} subtitle={getRangeSubtitle(fromDate, toDate)} value={statsRange} />
        <StatCard title="Importerte annonser" value={importCount} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 bg-white border rounded p-4">
          <h4 className="font-semibold mb-3">Type</h4>
          <StatList items={typeCounts} />
        </div>
        <div className="col-span-4 bg-white border rounded p-4">
          <h4 className="font-semibold mb-3">Leverandør</h4>
          <StatList items={supplierCounts} />
        </div>
        <div className="col-span-4 bg-white border rounded p-4">
          <h4 className="font-semibold mb-3">Status</h4>
          <StatList items={statusCounts} />
        </div>
        <div className="col-span-6 bg-white border rounded p-4">
          <h4 className="font-semibold mb-3">Topp publikasjoner</h4>
          <StatList items={topPublications} />
        </div>
        <div className="col-span-6 bg-white border rounded p-4">
          <h4 className="font-semibold mb-3">Nær frist, ikke godkjent</h4>
          <div className="text-sm text-slate-600 mb-2">
            Annonser med publiseringsdato innen 2 virkedager som ikke er godkjent
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">{nearDeadlineNotApproved}</div>
            <div className="text-sm text-slate-500">Siste 2 virkedager</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="col-span-12 md:col-span-2 bg-white border rounded p-4">
      <div className="text-xs text-slate-500">{title}</div>
      {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function StatList({ items }) {
  return (
    <ul className="text-sm space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between">
          <span className="text-slate-600">{item.label}</span>
          <span className="font-semibold">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

function EditorView({
  oppdrag,
  ad,
  setAd,
  onBack,
  onDone,
  suggestionBank,
  onAddSuggestion,
  initialStep,
  approvalMode,
  onApproveOrder,
  onRejectOrder,
  rejectComment,
}) {
  const [step, setStep] = useState(1);
  const [showSymbolBank, setShowSymbolBank] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [suggestionField, setSuggestionField] = useState(null);
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [rejectCommentText, setRejectCommentText] = useState("");

  useEffect(() => {
    setStep(initialStep || 1);
  }, [oppdrag?.id, initialStep]);

  useEffect(() => {
    if (!ad.relativesRows || ad.relativesRows.length === 0) {
      setAd((prev) => ({
        ...prev,
        relativesRows: [{ id: "row-1", layout: "one", left: "", right: "" }],
      }));
    }
  }, [ad.relativesRows, setAd]);

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

  const publicationOptions = [
    { name: "Adresseavisen", printDates: ["2026-01-28", "2026-01-29", "2026-01-30"] },
    { name: "Fædrelandsvennen", printDates: ["2026-01-27", "2026-01-28", "2026-01-31"] },
    { name: "Marsteinen", printDates: ["2026-01-26", "2026-01-29"] },
    { name: "Agderposten", printDates: ["2026-01-26", "2026-01-30"] },
  ];
  const selectedPublication = publicationOptions.find((p) => p.name === ad.publication);
  const printDates = selectedPublication ? selectedPublication.printDates : [];

  const templateOptions =
    ad.annonseType === "Takk"
      ? ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"]
      : ["1sp", "2sp", "1sp dobbelannonser"];

  const templateLayout = (label) => {
    const isTwoCol = label.includes("2sp");
    const hasSymbol = label.includes("symbol");
    const isDouble = label.includes("dobbel");
    return (
      <div className={`h-16 border rounded mb-2 bg-white p-2 ${isTwoCol ? "grid grid-cols-2 gap-2" : "flex"}`}>
        <div className="flex-1 flex flex-col justify-between">
          <div className="h-2 bg-slate-200 rounded" />
          <div className="h-2 bg-slate-200 rounded w-3/4" />
          <div className="h-2 bg-slate-200 rounded w-5/6" />
        </div>
        {hasSymbol ? <div className="w-6 h-6 border rounded-full self-center ml-2" /> : null}
        {isDouble ? <div className="w-2 h-full bg-slate-100 ml-2" /> : null}
      </div>
    );
  };

  const symbolOptions = ["✝", "❦", "✶", "✜", "✟", "✙", "✞", "✤", "✧", "✿", "❀"];
  const filteredSymbols = symbolOptions.filter((s) => s.includes(symbolSearch.trim()));

  const fullName = [ad.firstName, ad.middleName, ad.lastName].filter(Boolean).join(" ").trim();
  const step1Valid = Boolean(ad.publication && ad.printDate && ad.digitalDate);
  const step2Valid = Boolean(ad.annonseType && ad.template);

  const suggestionsForField = useMemo(() => {
    if (!suggestionField) return [];
    const list = suggestionBank?.[suggestionField] || [];
    const needle = suggestionSearch.toLowerCase().trim();
    const filtered = needle ? list.filter((i) => i.text.toLowerCase().includes(needle)) : list;
    return [...filtered].sort((a, b) => b.count - a.count);
  }, [suggestionBank, suggestionField, suggestionSearch]);

  function renderPreview() {
    if (ad.annonseType === "Takk") {
      return (
        <div className="border-2 border-slate-400 rounded p-6 bg-white">
          {ad.symbol ? (
            <div className="mb-3 text-center" style={{ fontSize: `${ad.symbolSize || 24}px` }}>
              {ad.symbol}
            </div>
          ) : null}
          <div className="text-lg font-bold mb-2">Hjertelig takk</div>
          <div className="text-sm leading-relaxed mb-3">
            {ad.takkBody1 || ""}
            {ad.takkName ? " " : ""}
            {ad.takkName ? <span className="font-semibold">{ad.takkName}</span> : null}
            {ad.takkBody2 ? ` ${ad.takkBody2}` : ""}
          </div>
          {ad.takkSignature ? <div className="text-sm text-right font-semibold">{ad.takkSignature}</div> : null}
        </div>
      );
    }

    return (
      <div className="border rounded p-6 text-center bg-white">
        {ad.symbol ? (
          <div className="mb-3" style={{ fontSize: `${ad.symbolSize || 24}px` }}>
            {ad.symbol}
          </div>
        ) : null}
        {ad.intro ? <div className="text-sm italic mb-2">{ad.intro}</div> : null}
        {ad.title ? <div className="text-sm mb-1">{ad.title}</div> : null}
        {fullName ? <div className="text-2xl font-bold mb-1">{fullName}</div> : null}
        {ad.maidenName || ad.birthDate ? (
          <div className="text-sm mb-2">
            f. {[ad.maidenName, ad.birthDate ? formatDate(ad.birthDate) : ""].filter(Boolean).join(" ")}
          </div>
        ) : null}
        {ad.nickname ? <div className="text-sm mb-2">"{ad.nickname}"</div> : null}
        {ad.deathFreeText || ad.deathPlace || ad.deathDate ? (
          <div className="text-sm mb-3">
            {formatDeathLine(ad.deathFreeText, ad.deathPlace, ad.deathDate)}
          </div>
        ) : null}
        {ad.verse1 ? <div className="text-sm italic mb-3">{ad.verse1}</div> : null}
        {ad.relativesRows?.length ? (
          <div className="mb-3 text-sm space-y-2">
            {ad.relativesRows.map((row) => {
              if (row.layout === "empty") return <div key={row.id} className="h-3" />;
              if (row.layout === "relation-one") {
                return (
                  <div key={row.id} className="text-xs text-slate-500 text-center">
                    {row.left ? `(${row.left})` : ""}
                  </div>
                );
              }
              if (row.layout === "relation-two") {
                return (
                  <div key={row.id} className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                    <div>{row.left ? `(${row.left})` : ""}</div>
                    <div>{row.right ? `(${row.right})` : ""}</div>
                  </div>
                );
              }
              if (row.layout === "two") {
                return (
                  <div key={row.id} className="grid grid-cols-2 gap-4">
                    <div>{row.left}</div>
                    <div>{row.right}</div>
                  </div>
                );
              }
              return (
                <div key={row.id} className="text-center">
                  {row.left}
                </div>
              );
            })}
          </div>
        ) : null}
        {ad.verse2 ? <div className="text-sm italic mb-3">{ad.verse2}</div> : null}
        {ad.ceremonyInfo ? <div className="text-sm mb-2">{ad.ceremonyInfo}</div> : null}
        {ad.donations ? <div className="text-sm mb-2">{ad.donations}</div> : null}
        {ad.agency ? <div className="text-sm whitespace-pre-line">{ad.agency}</div> : null}
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
            Editor â€” {oppdrag.avdoede?.fornavn} {oppdrag.avdoede?.etternavn}
          </span>
        </div>
        <div className="flex items-center gap-3" />
      </div>

      <div className="bg-white border rounded p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Steg {step} av 4</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
              Forrige
            </button>
            {step < 4 ? (
              <button
                className="px-3 py-1 bg-slate-800 text-white rounded"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              >
                Neste
              </button>
            ) : (
              <button
                className="px-3 py-1 bg-slate-800 text-white rounded"
                onClick={() => {
                  alert("Din bestilling er sendt til godkjenning. Du vil få e-post når mediehuset har godkjent bestillingen");
                  onDone?.();
                }}
              >
                Send bestilling
              </button>
            )}
          </div>
        </div>
        {step === 1 && !step1Valid ? <div className="text-xs text-red-600 mt-2">Velg publikasjon og begge publiseringsdatoer.</div> : null}
        {step === 2 && !step2Valid ? <div className="text-xs text-red-600 mt-2">Velg annonsetype og mal.</div> : null}
      </div>

      {step === 1 && (
        <div className="bg-white border rounded p-6">
          <h4 className="font-semibold mb-4">1. Publikasjonskalender</h4>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <label className="text-sm block">Publikasjon</label>
              <select
                className="w-full border p-2 rounded mt-1 text-sm"
                value={ad.publication}
                onChange={(e) => setAd({ ...ad, publication: e.target.value, printDate: "" })}
              >
                <option value="">Velg publikasjon</option>
                {publicationOptions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-4">
              <label className="text-sm block">Innrykk print</label>
              <input
                type="date"
                className="w-full border p-2 rounded mt-1 text-sm"
                value={ad.printDate}
                onChange={(e) => setAd({ ...ad, printDate: e.target.value })}
                disabled={!ad.publication}
                list="print-date-options"
              />
              <datalist id="print-date-options">
                {printDates.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            <div className="col-span-4">
              <label className="text-sm block">Publisering digitalt</label>
              <input
                type="date"
                className="w-full border p-2 rounded mt-1 text-sm"
                value={ad.digitalDate}
                onChange={(e) => setAd({ ...ad, digitalDate: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white border rounded p-6">
          <h4 className="font-semibold mb-4">2. Velg mal</h4>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <label className="text-sm block">Type annonse</label>
              <select
                className="w-full border p-2 rounded mt-1 text-sm"
                value={ad.annonseType}
                onChange={(e) => setAd({ ...ad, annonseType: e.target.value, template: "" })}
              >
                <option value="">Velg type</option>
                <option value="Død">Død</option>
                <option value="Takk">Takk</option>
              </select>
            </div>
            <div className="col-span-8">
              <label className="text-sm block">Type mal</label>
              <div className="grid grid-cols-4 gap-3 mt-1">
                {templateOptions.map((t) => (
                  <button
                    key={t}
                    className={`border rounded p-3 text-sm text-left ${ad.template === t ? "border-slate-800 bg-slate-50" : "hover:bg-slate-50"}`}
                    onClick={() => setAd({ ...ad, template: t })}
                  >
                    {templateLayout(t)}
                    <div className="font-semibold">{t}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-6 bg-white border rounded p-6">
            <h4 className="font-semibold mb-4">3. Innhold</h4>
            {rejectComment ? (
              <div className="mb-3 text-xs text-slate-500">
                Kommentar ved avslag av annonse: {rejectComment}
              </div>
            ) : null}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6">
                <label className="text-sm block">Symbol</label>
                <div className="flex gap-2 mt-1">
                  <input className="w-full border p-2 rounded text-sm" value={ad.symbol} onChange={(e) => setAd({ ...ad, symbol: e.target.value })} />
                  <button className="px-3 py-1 border rounded" onClick={() => setShowSymbolBank(true)}>
                    Velg
                  </button>
                </div>
              </div>
              <div className="col-span-6">
                <label className="text-sm block">Symbolstørrelse</label>
                <div className="flex items-center gap-2 mt-1">
                  <button className="px-2 py-1 border rounded" onClick={() => setAd({ ...ad, symbolSize: Math.max(12, ad.symbolSize - 2) })}>
                    -
                  </button>
                  <div className="text-sm">{ad.symbolSize}px</div>
                  <button className="px-2 py-1 border rounded" onClick={() => setAd({ ...ad, symbolSize: Math.min(64, ad.symbolSize + 2) })}>
                    +
                  </button>
                </div>
              </div>
              {ad.annonseType === "Takk" ? (
                <>
                  <div className="col-span-12">
                    <label className="text-sm block">Hjertelig takk</label>
                    <input className="w-full border p-2 rounded mt-1 text-sm bg-slate-50" value="Hjertelig takk" readOnly />
                  </div>
                  <div className="col-span-12">
                    <label className="text-sm block">Takketekst 1</label>
                    <textarea
                      className="w-full border p-2 rounded mt-1 text-sm"
                      rows={3}
                      placeholder="F.eks. for all vennlig deltakelse, blomster, oppmerksomhet og minnegaver"
                      value={ad.takkBody1}
                      onChange={(e) => setAd({ ...ad, takkBody1: e.target.value })}
                    />
                  </div>
                  <div className="col-span-6">
                    <label className="text-sm block">Navn</label>
                    <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.takkName} onChange={(e) => setAd({ ...ad, takkName: e.target.value })} />
                  </div>
                  <div className="col-span-6">
                    <label className="text-sm block">Takketekst 2</label>
                    <input
                      className="w-full border p-2 rounded mt-1 text-sm"
                      placeholder="F.eks. bortgang og begravelse"
                      value={ad.takkBody2}
                      onChange={(e) => setAd({ ...ad, takkBody2: e.target.value })}
                    />
                  </div>
                  <div className="col-span-12">
                    <label className="text-sm block">Signatur</label>
                    <input
                      className="w-full border p-2 rounded mt-1 text-sm"
                      placeholder="F.eks. Arne, Petra og Frank med familier"
                      value={ad.takkSignature}
                      onChange={(e) => setAd({ ...ad, takkSignature: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
              <div className="col-span-12">
                <label className="text-sm block">Innledning</label>
                <div className="flex gap-2 mt-1">
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder="F.eks. Vår alles kjære"
                    value={ad.intro}
                    onChange={(e) => setAd({ ...ad, intro: e.target.value })}
                    onBlur={() => onAddSuggestion?.("intro", ad.intro)}
                  />
                  <button className="px-3 py-1 border rounded text-sm" onClick={() => setSuggestionField("intro")}>
                    Velg fra bank
                  </button>
                </div>
              </div>
                  <div className="col-span-12">
                    <label className="text-sm block">Tittel</label>
                    <input
                      className="w-full border p-2 rounded mt-1 text-sm"
                      placeholder="F.eks. doktor"
                      value={ad.title}
                      onChange={(e) => setAd({ ...ad, title: e.target.value })}
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-sm block">Fornavn</label>
                    <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.firstName} onChange={(e) => setAd({ ...ad, firstName: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-sm block">Mellomnavn</label>
                    <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.middleName} onChange={(e) => setAd({ ...ad, middleName: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-sm block">Etternavn</label>
                    <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.lastName} onChange={(e) => setAd({ ...ad, lastName: e.target.value })} />
                  </div>
                  <div className="col-span-6">
                    <label className="text-sm block">Fødenavn</label>
                    <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.maidenName} onChange={(e) => setAd({ ...ad, maidenName: e.target.value })} />
                  </div>
                  <div className="col-span-6">
                    <label className="text-sm block">Kallenavn</label>
                    <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.nickname} onChange={(e) => setAd({ ...ad, nickname: e.target.value })} />
                  </div>
                  <div className="col-span-6">
                    <label className="text-sm block">Fødselsdato</label>
                    <input type="date" className="w-full border p-2 rounded mt-1 text-sm" value={ad.birthDate} onChange={(e) => setAd({ ...ad, birthDate: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-sm block">Fritekst</label>
                    <input
                      className="w-full border p-2 rounded mt-1 text-sm"
                      placeholder="F.eks. Døde fra oss i dag"
                      value={ad.deathFreeText}
                      onChange={(e) => setAd({ ...ad, deathFreeText: e.target.value })}
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-sm block">Dødssted</label>
                    <input className="w-full border p-2 rounded mt-1 text-sm" value={ad.deathPlace} onChange={(e) => setAd({ ...ad, deathPlace: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <label className="text-sm block">Dødsdato</label>
                    <input type="date" className="w-full border p-2 rounded mt-1 text-sm" value={ad.deathDate} onChange={(e) => setAd({ ...ad, deathDate: e.target.value })} />
                  </div>
              <div className="col-span-12">
                <label className="text-sm block">Vers 1</label>
                <textarea
                  className="w-full border p-2 rounded mt-1 text-sm"
                  rows={2}
                  value={ad.verse1}
                  onChange={(e) => setAd({ ...ad, verse1: e.target.value })}
                  onBlur={() => onAddSuggestion?.("verse1", ad.verse1)}
                />
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 border rounded text-sm" onClick={() => setSuggestionField("verse1")}>
                    Velg fra bank
                  </button>
                </div>
              </div>
                  <div className="col-span-12">
                    <label className="text-sm block">Pårørende</label>
                    <div className="text-xs text-slate-500 mt-1">
                      Bruk 1 kolonne for partner. 2 kolonner for barn + partner. Legg inn tom rad for å skille grupper.
                    </div>
                    <div className="mt-2 space-y-2">
                      {(ad.relativesRows || []).map((row, idx) => (
                        <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3">
                            <select
                              className="w-full border p-2 rounded text-sm"
                              value={row.layout}
                              onChange={(e) => {
                                const next = [...ad.relativesRows];
                                next[idx] = { ...row, layout: e.target.value };
                                setAd({ ...ad, relativesRows: next });
                              }}
                            >
                          <option value="one">1 kolonne</option>
                          <option value="two">2 kolonner</option>
                          <option value="relation-one">Relasjon 1 kolonne</option>
                          <option value="relation-two">Relasjon 2 kolonner</option>
                          <option value="empty">Tom rad</option>
                        </select>
                      </div>
                      <div className="col-span-4">
                        <input
                          className={`w-full border p-2 rounded ${row.layout.startsWith("relation") ? "text-xs" : "text-sm"}`}
                          placeholder={
                            row.layout === "relation-one"
                              ? "f.eks. kone"
                              : row.layout === "relation-two"
                              ? "f.eks. datter"
                              : ""
                          }
                          value={row.left || ""}
                          disabled={row.layout === "empty"}
                          onChange={(e) => {
                            const next = [...ad.relativesRows];
                            next[idx] = { ...row, left: e.target.value };
                            setAd({ ...ad, relativesRows: next });
                          }}
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          className={`w-full border p-2 rounded ${row.layout.startsWith("relation") ? "text-xs" : "text-sm"}`}
                          placeholder={row.layout === "relation-two" ? "f.eks. svigersønn" : ""}
                          value={row.right || ""}
                          disabled={row.layout !== "two" && row.layout !== "relation-two"}
                          onChange={(e) => {
                            const next = [...ad.relativesRows];
                            next[idx] = { ...row, right: e.target.value };
                            setAd({ ...ad, relativesRows: next });
                          }}
                        />
                      </div>
                          <div className="col-span-1 text-right">
                            <button
                              className="px-2 py-1 border rounded"
                              onClick={() => {
                                const next = ad.relativesRows.filter((_, i) => i !== idx);
                                setAd({ ...ad, relativesRows: next });
                              }}
                            >
                              -
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                  <button
                    className="px-3 py-1 border rounded"
                    onClick={() =>
                      setAd({
                        ...ad,
                        relativesRows: [...(ad.relativesRows || []), { id: `row-${Date.now()}`, layout: "one", left: "", right: "" }],
                      })
                    }
                  >
                    Legg til 1 kolonne
                  </button>
                  <button
                    className="px-3 py-1 border rounded"
                    onClick={() =>
                      setAd({
                        ...ad,
                        relativesRows: [...(ad.relativesRows || []), { id: `row-${Date.now()}`, layout: "two", left: "", right: "" }],
                      })
                    }
                  >
                    Legg til 2 kolonner
                  </button>
                  <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                      const prev = ad.relativesRows?.[ad.relativesRows.length - 1];
                      const layout = prev && (prev.layout === "two" || prev.layout === "relation-two") ? "relation-two" : "relation-one";
                      setAd({
                        ...ad,
                        relativesRows: [...(ad.relativesRows || []), { id: `row-${Date.now()}`, layout, left: "", right: "" }],
                      });
                    }}
                  >
                    Legg til relasjon
                  </button>
                  <button
                    className="px-3 py-1 border rounded"
                    onClick={() =>
                      setAd({
                        ...ad,
                            relativesRows: [...(ad.relativesRows || []), { id: `row-${Date.now()}`, layout: "empty", left: "", right: "" }],
                          })
                        }
                      >
                        Legg til tom rad
                      </button>
                    </div>
                  </div>
              <div className="col-span-12">
                <label className="text-sm block">Vers 2</label>
                <textarea
                  className="w-full border p-2 rounded mt-1 text-sm"
                  rows={2}
                  value={ad.verse2}
                  onChange={(e) => setAd({ ...ad, verse2: e.target.value })}
                  onBlur={() => onAddSuggestion?.("verse2", ad.verse2)}
                />
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 border rounded text-sm" onClick={() => setSuggestionField("verse2")}>
                    Velg fra bank
                  </button>
                </div>
              </div>
              <div className="col-span-12">
                <label className="text-sm block">Informasjon om seremonitid og sted</label>
                <div className="flex gap-2 mt-1">
                  <textarea
                    className="w-full border p-2 rounded text-sm"
                    rows={2}
                    value={ad.ceremonyInfo}
                    onChange={(e) => setAd({ ...ad, ceremonyInfo: e.target.value })}
                    onBlur={() => onAddSuggestion?.("ceremonyInfo", ad.ceremonyInfo)}
                  />
                  <button className="px-3 py-1 border rounded text-sm" onClick={() => setSuggestionField("ceremonyInfo")}>
                    Velg fra bank
                  </button>
                </div>
              </div>
              <div className="col-span-12">
                <label className="text-sm block">Informasjon om gaver/donasjoner</label>
                <div className="flex gap-2 mt-1">
                  <textarea
                    className="w-full border p-2 rounded text-sm"
                    rows={2}
                    placeholder="F.eks. Like kjært som blomster er"
                    value={ad.donations}
                    onChange={(e) => setAd({ ...ad, donations: e.target.value })}
                    onBlur={() => onAddSuggestion?.("donations", ad.donations)}
                  />
                  <button className="px-3 py-1 border rounded text-sm" onClick={() => setSuggestionField("donations")}>
                    Velg fra bank
                  </button>
                </div>
              </div>
                  <div className="col-span-6">
                    <label className="text-sm block">Byrånavn</label>
                    <textarea
                      className="w-full border p-2 rounded mt-1 text-sm"
                      rows={2}
                      value={ad.agency}
                      onChange={(e) => setAd({ ...ad, agency: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="col-span-6">
            <div className="mb-2 text-sm text-slate-600">Livevisning</div>
            {renderPreview()}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 bg-white border rounded p-6">
            <h4 className="font-semibold mb-4">4. Korrektur</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-600 mb-2">Digital</div>
                {renderPreview()}
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-2">Print</div>
                {renderPreview()}
              </div>
            </div>
          </div>
          <div className="col-span-5 bg-white border rounded p-6">
            <h4 className="font-semibold mb-4">Ordreoversikt</h4>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-slate-600">Publikasjon:</span> {ad.publication || "-"}
              </div>
              <div>
                <span className="text-slate-600">Innrykk print:</span> {ad.printDate ? formatDate(ad.printDate) : "-"}
              </div>
              <div>
                <span className="text-slate-600">Innrykk digitalt:</span> {ad.digitalDate ? formatDate(ad.digitalDate) : "-"}
              </div>
              <div>
                <span className="text-slate-600">Totalbeløp inkl. mva:</span> -
              </div>
            </div>
            {approvalMode ? (
              <div className="mt-6 space-y-2">
                <button
                  className="w-full bg-green-600 text-white py-2 rounded"
                  onClick={() => onApproveOrder?.()}
                >
                  Godkjenn bestilling
                </button>
                <button
                  className="w-full bg-red-600 text-white py-2 rounded"
                  onClick={() => {
                    if (!rejectCommentText.trim()) {
                      alert("Legg til kommentar før du avslår bestillingen.");
                      return;
                    }
                    onRejectOrder?.(rejectCommentText.trim());
                  }}
                >
                  Avslå bestilling med kommentar
                </button>
                <textarea
                  className="w-full border p-2 rounded text-sm"
                  rows={2}
                  placeholder="Kommentar til bestiller"
                  value={rejectCommentText}
                  onChange={(e) => setRejectCommentText(e.target.value)}
                />
                <button className="w-full border py-2 rounded" onClick={() => setStep(1)}>
                  Endre annonse
                </button>
              </div>
            ) : (
              <button
                className="mt-6 w-full bg-slate-800 text-white py-2 rounded"
                onClick={() => {
                  alert("Din bestilling er sendt til godkjenning. Du vil få e-post når mediehuset har godkjent bestillingen");
                  onDone?.();
                }}
              >
                Send bestilling
              </button>
            )}
          </div>
        </div>
      )}

      {showSymbolBank && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Symbolbank</h3>
              <button className="px-2 py-1 border rounded" onClick={() => setShowSymbolBank(false)}>
                Lukk
              </button>
            </div>
            <input className="w-full border p-2 rounded text-sm mb-3" placeholder="Søk symbol" value={symbolSearch} onChange={(e) => setSymbolSearch(e.target.value)} />
            <div className="grid grid-cols-6 gap-2">
              {filteredSymbols.map((s) => (
                <button
                  key={s}
                  className="border rounded p-2 text-lg hover:bg-slate-50"
                  onClick={() => {
                    setAd({ ...ad, symbol: s });
                    setShowSymbolBank(false);
                    setSymbolSearch("");
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {suggestionField && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Velg tidligere tekst</h3>
              <button
                className="px-2 py-1 border rounded"
                onClick={() => {
                  setSuggestionField(null);
                  setSuggestionSearch("");
                }}
              >
                Lukk
              </button>
            </div>
            <input
              className="w-full border p-2 rounded text-sm mb-3"
              placeholder="Søk i tekstbank"
              value={suggestionSearch}
              onChange={(e) => setSuggestionSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-auto border rounded">
              {suggestionsForField.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">Ingen lagrede forslag ennå.</div>
              ) : (
                <ul>
                  {suggestionsForField.map((item) => (
                    <li key={item.text} className="border-b last:border-b-0">
                      <button
                        className="w-full text-left p-3 hover:bg-slate-50"
                        onClick={() => {
                          setAd({ ...ad, [suggestionField]: item.text });
                          onAddSuggestion?.(suggestionField, item.text);
                          setSuggestionField(null);
                          setSuggestionSearch("");
                        }}
                      >
                        <div className="text-sm">{item.text}</div>
                        <div className="text-xs text-slate-400">Brukt {item.count} ganger</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAnnonceFromOppdragModal({ oppdragList, onClose, onConfirm }) {
  const [selectedId, setSelectedId] = useState("");
  const activeOppdrag = oppdragList.filter((o) => o.status !== "Levert/Godkjent");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-3/4 max-w-3xl p-6 overflow-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Opprett annonse</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>
            Lukk
          </button>
        </div>

        <div className="text-sm text-slate-600 mb-3">Velg et aktivt oppdrag som annonsen skal knyttes til.</div>

        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Velg</th>
                <th className="p-3 text-left">Navn</th>
                <th className="p-3 text-left">Oppdrag</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeOppdrag.map((o) => (
                <tr key={o.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <input type="radio" name="oppdrag" checked={selectedId === o.id} onChange={() => setSelectedId(o.id)} />
                  </td>
                  <td className="p-3">
                    {o.avdoede?.fornavn} {o.avdoede?.mellomnavn ? `${o.avdoede.mellomnavn} ` : ""}
                    {o.avdoede?.etternavn}
                  </td>
                  <td className="p-3">{o.id}</td>
                  <td className="p-3">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onClose}>
            Avbryt
          </button>
          <button className="px-3 py-1 bg-slate-800 text-white rounded" onClick={() => onConfirm(selectedId)} disabled={!selectedId}>
            Bekreft og åpne editor
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePubliseringModal({ annonse, onClose, onSave }) {
  const [dato, setDato] = useState(() => toDateInput(annonse.publisering));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Endre publiseringsdato</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>
            Lukk
          </button>
        </div>
        <div className="text-sm text-slate-600 mb-3">{annonse.navn}</div>
        <label className="text-sm block">Publiseringsdato</label>
        <input type="date" className="w-full border p-2 rounded mt-1" value={dato} onChange={(e) => setDato(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onClose}>
            Avbryt
          </button>
          <button className="px-3 py-1 bg-slate-800 text-white rounded" onClick={() => onSave(dato)}>
            Lagre
          </button>
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

function Placeholder({ title, contentClass }) {
  return (
    <div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <div className={`bg-white border p-6 rounded ${contentClass || ""}`}>Innhold kommer</div>
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

function sampleAnnonser() {
  return [
    {
      id: "19384",
      leverandor: "Memcare",
      type: "Død",
      navn: "Reydun Wegner Lundekvam",
      publisering: "2026-01-29T01:00:00",
      opprettet: "2026-01-26T10:32:49",
      endret: "2026-01-26T10:32:49",
      publikasjon: "Marsteinen",
      status: "I kø",
    },
    {
      id: "19297",
      leverandor: "Memcare",
      type: "Død",
      navn: "Arnulf Georg Gabrielsen",
      publisering: "2026-01-28T01:00:00",
      opprettet: "2026-01-25T01:00:01",
      endret: "2026-01-25T01:00:01",
      publikasjon: "Fædrelandsvennen",
      status: "I kø",
    },
    {
      id: "3048214",
      leverandor: "Adstate",
      type: "Død",
      navn: "Ove Henning Berdahl",
      publisering: "2026-01-26T01:00:00",
      opprettet: "2026-01-26T00:02:24",
      endret: "2026-01-26T10:32:27",
      publikasjon: "Adresseavisen",
      status: "I kø",
    },
    {
      id: "3048316",
      leverandor: "Adstate",
      type: "Takk",
      navn: "Mario V. Urquizo",
      publisering: "2026-01-26T01:00:00",
      opprettet: "2026-01-26T00:02:24",
      endret: "2026-01-26T10:32:27",
      publikasjon: "Agderposten",
      status: "I kø",
    },
    {
      id: "A-oppdrag-1",
      leverandor: "Oppdrag",
      type: "Død",
      navn: "Kari Nordmann",
      publisering: "2025-12-28T01:00:00",
      opprettet: "2025-12-23T10:32:27",
      endret: "2025-12-23T10:32:27",
      publikasjon: "Adresseavisen",
      status: "I kø",
      oppdragId: "O-1a2b3c",
      produsent: "torgeir.roness",
    },
  ];
}

function defaultSuggestionBank() {
  return {
    intro: [
      { text: "Vår alles kjære", count: 5 },
      { text: "Kjære", count: 2 },
    ],
    verse1: [
      { text: "Du gav oss så mye", count: 7 },
      { text: "Takk for alt du var", count: 4 },
    ],
    verse2: [
      { text: "Minnene lever videre", count: 3 },
    ],
    ceremonyInfo: [
      { text: "Seremoni i Trondheim domkirke", count: 2 },
      { text: "Bisettelse i Lademoen kirke", count: 1 },
    ],
    donations: [
      { text: "Like kjært som blomster er en gave til kreftforeningen", count: 3 },
      { text: "Minnegave til kirkens bymisjon", count: 1 },
    ],
  };
}

function sampleImportLogs() {
  return [
    {
      id: "log-1",
      timestamp: "2026-01-27T10:14:01",
      fileUrl: "3048922-2-kill.xml",
      status: "success",
      count: 1,
      items: [
        { adId: "3048897", type: "Død", name: "Rigmor Pettersen", webPublisering: "2026-01-26T01:00:00" },
      ],
    },
    {
      id: "log-2",
      timestamp: "2026-01-27T10:03:03",
      fileUrl: "2026-01-27-10-00-08-ad_list.xml",
      status: "success",
      count: 447,
      items: [
        { adId: "3048891", type: "Død", name: "Jan Erik Olsen", webPublisering: "2026-01-27T01:00:00" },
        { adId: "3048892", type: "Takk", name: "Sigrid Løken", webPublisering: "2026-01-27T01:00:00" },
      ],
    },
    {
      id: "log-3",
      timestamp: "2026-01-27T09:36:05",
      fileUrl: "https://core.prod.memcare.com/api/v2/public/address...",
      status: "success",
      count: 19,
      items: [
        { adId: "3048810", type: "Død", name: "Ellen Skaare", webPublisering: "2026-01-27T01:00:00" },
      ],
    },
  ];
}

function defaultAd() {
  return {
    publication: "",
    printDate: "",
    digitalDate: "",
    annonseType: "Død",
    template: "",
    symbol: "✝",
    symbolSize: 24,
    intro: "",
    title: "",
    firstName: "",
    middleName: "",
    lastName: "",
    maidenName: "",
    nickname: "",
    birthDate: "",
    deathPlace: "",
    deathDate: "",
    deathFreeText: "",
    verse1: "",
    relativesRows: [{ id: "row-1", layout: "one", left: "", right: "" }],
    verse2: "",
    ceremonyInfo: "",
    donations: "",
    agency: "",
    takkBody1: "",
    takkBody2: "",
    takkName: "",
    takkSignature: "",
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

function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("no-NB", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addBusinessDays(fromDate, days) {
  let count = 0;
  const d = new Date(fromDate);
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
  }
  return d;
}

function isWithinBusinessDays(iso, startDays, endDays) {
  if (!iso) return false;
  const today = startOfDay(new Date());
  const start = addBusinessDays(today, startDays);
  const end = addBusinessDays(today, endDays);
  const d = startOfDay(new Date(iso));
  return d >= start && d <= end;
}

function formatDeathLine(freeText, place, dateIso) {
  const date = dateIso ? formatDate(dateIso) : "";
  const placeDate = [place, date].filter(Boolean).join(", ");
  const cleaned = freeText ? freeText.trim() : "";
  if (!cleaned) return placeDate;
  const suffix = /[.!?]$/.test(cleaned) ? "" : ".";
  return [cleaned + suffix, placeDate].filter(Boolean).join(" ").trim();
}

function statusClass(status) {
  if (status === "Godkjent") return "bg-green-100 text-green-700";
  if (status === "I kø") return "bg-yellow-100 text-yellow-700";
  if (status === "Sendt til godkjenning") return "bg-blue-100 text-blue-700";
  if (status === "Ikke godkjent") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function getSelectedAnnonceStatus(annonser, selectedId) {
  if (!selectedId) return "";
  const a = annonser.find((x) => x.id === selectedId);
  return a ? a.status : "";
}

function getSelectedAnnonce(annonser, selectedId) {
  if (!selectedId) return null;
  return annonser.find((x) => x.id === selectedId) || null;
}

function getPublications(annonser) {
  const unique = new Set(annonser.map((a) => a.publikasjon).filter(Boolean));
  return ["Alle", ...Array.from(unique)];
}

function countBy(list, getKey) {
  const map = new Map();
  list.forEach((item) => {
    const key = getKey(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
}

function topN(items, n) {
  return [...items].sort((a, b) => b.count - a.count).slice(0, n);
}

function countLastDays(annonser, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return annonser.filter((a) => {
    const d = a.opprettet ? new Date(a.opprettet) : null;
    return d && d >= cutoff;
  }).length;
}

function getPresetRange(preset, customFrom, customTo) {
  const today = startOfDay(new Date());
  if (preset === "Denne uken") {
    const start = new Date(today);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return { fromDate: start, toDate: today, label: "Denne uken" };
  }
  if (preset === "Denne måneden") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { fromDate: start, toDate: today, label: "Denne måneden" };
  }
  if (preset === "Dette året") {
    const start = new Date(today.getFullYear(), 0, 1);
    return { fromDate: start, toDate: today, label: "Dette året" };
  }
  if (preset === "Siste uke") {
    const from = new Date(today);
    from.setDate(from.getDate() - 7);
    return { fromDate: from, toDate: today, label: "Siste uke" };
  }
  if (preset === "Siste 30 dager") {
    const from = new Date(today);
    from.setDate(from.getDate() - 30);
    return { fromDate: from, toDate: today, label: "Siste 30 dager" };
  }
  if (preset === "Siste år") {
    const from = new Date(today);
    from.setDate(from.getDate() - 365);
    return { fromDate: from, toDate: today, label: "Siste år" };
  }
  const fromDate = customFrom ? startOfDay(new Date(customFrom)) : null;
  const toDate = customTo ? startOfDay(new Date(customTo)) : null;
  return { fromDate, toDate, label: "Egendefinert" };
}

function filterByDateRange(list, fromDate, toDate) {
  return list.filter((a) => {
    const d = a.opprettet ? new Date(a.opprettet) : null;
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });
}

function getRangeSubtitle(fromDate, toDate) {
  if (!fromDate && !toDate) return "";
  const from = fromDate ? formatDate(fromDate.toISOString()) : "";
  const to = toDate ? formatDate(toDate.toISOString()) : "";
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

function toDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
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

