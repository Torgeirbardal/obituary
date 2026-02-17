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
  const [selectedExternalAnnonceId, setSelectedExternalAnnonceId] = useState(null);
  const [selectedImportId, setSelectedImportId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAnnonceModal, setShowCreateAnnonceModal] = useState(false);
  const [editingAnnonceDate, setEditingAnnonceDate] = useState(null);
  const [editingOppdrag, setEditingOppdrag] = useState(null);
  const currentUser = "torgeir.roness";
  const [suggestionBank, setSuggestionBank] = useState(defaultSuggestionBank());
  const [symbolLibrary, setSymbolLibrary] = useState(defaultSymbolLibrary());
  const [templateConfig, setTemplateConfig] = useState(defaultTemplateConfig());
  const [priceList, setPriceList] = useState(defaultPriceList());
  const [customerCards, setCustomerCards] = useState(defaultCustomerCards());
  const [auditLog, setAuditLog] = useState([]);

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

  function logAction({ module, entity, entityId, action, details }) {
    const entry = {
      id: `log-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      user: currentUser,
      module,
      entity,
      entityId,
      action,
      details,
    };
    setAuditLog((prev) => [entry, ...prev]);
  }

  useEffect(() => {
    if (auditLog.length) return;
    const seed = [];
    oppdragList.forEach((op) => {
      seed.push({
        id: `seed-op-${op.id}`,
        timestamp: op.createdAt || new Date().toISOString(),
        user: "system",
        module: "Oppdrag",
        entity: "Oppdrag",
        entityId: op.id,
        action: "Oppdrag generert",
        details: `${op.avdoede?.fornavn || ""} ${op.avdoede?.etternavn || ""}`.trim(),
      });
    });
    annonseList.forEach((a) => {
      if (a.leverandor && a.leverandor !== "Oppdrag") {
        seed.push({
          id: `seed-imp-${a.id}`,
          timestamp: a.opprettet || new Date().toISOString(),
          user: "system",
          module: "Annonser",
          entity: "Annonce",
          entityId: a.id,
          action: "Annonce importert",
          details: a.leverandor,
        });
      }
    });
    if (seed.length) {
      setAuditLog(seed);
    }
  }, [auditLog.length, oppdragList, annonseList]);

  function updateAnnonce(annonceId, updates, logInfo) {
    const now = new Date().toISOString();
    setAnnonceList((s) =>
      s.map((a) =>
        a.id === annonceId
          ? {
              ...a,
              ...updates,
              endret: updates.endret || now,
              lastEditedBy: currentUser,
              lastEditedAt: now,
            }
          : a
      )
    );
    if (logInfo) {
      logAction({
        module: "Annonser",
        entity: "Annonce",
        entityId: annonceId,
        action: logInfo.action,
        details: logInfo.details,
      });
    }
  }

  function approveAnnonce(id) {
    updateAnnonce(id, { status: "Godkjent" }, { action: "Godkjent annonse" });
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
    updateAnnonce(annonceId, { publisering: dato }, { action: "Endret publiseringsdato", details: dato });
    setEditingAnnonceDate(null);
  }

  function markAnnonceSent() {
    if (!selectedAnnonceId) return;
    updateAnnonce(selectedAnnonceId, { status: "Sendt til godkjenning" }, { action: "Sendt til godkjenning" });
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
  const selectedExternalAnnonce = annonseList.find((a) => a.id === selectedExternalAnnonceId) || null;

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
              updateAnnonce(selectedAnnonceId, { status: "Godkjent" }, { action: "Godkjent annonse" });
              setView("annonser");
            }}
            onRejectOrder={(comment) => {
              updateAnnonce(
                selectedAnnonceId,
                { status: "Ikke godkjent", rejectComment: comment },
                { action: "Underkjent annonse", details: comment }
              );
              setView("annonser");
            }}
            symbolLibrary={symbolLibrary}
            templateConfig={templateConfig}
            priceList={priceList}
            customerCards={customerCards}
            auditLog={auditLog}
            currentAnnonceId={selectedAnnonceId}
          />
        )}

        {view === "annonser" && (
          <AnnonserView
            annonseList={annonseList}
            onCreate={() => setShowCreateAnnonceModal(true)}
            onApprove={(id) => approveAnnonce(id)}
            onEdit={(annonce) => openEditorForAnnonce(annonce)}
            onOpenExternal={(annonce) => {
              setSelectedExternalAnnonceId(annonce.id);
              setView("external-annonce");
            }}
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
        {view === "admin" && (
          <AdminUsersView
            currentUser={currentUser}
            symbolLibrary={symbolLibrary}
            setSymbolLibrary={setSymbolLibrary}
            templateConfig={templateConfig}
            setTemplateConfig={setTemplateConfig}
            priceList={priceList}
            setPriceList={setPriceList}
            customerCards={customerCards}
            setCustomerCards={setCustomerCards}
            auditLog={auditLog}
            onLogAction={logAction}
          />
        )}
        {view === "external-annonce" && (
          <ExternalAnnonceDetailView
            annonce={selectedExternalAnnonce}
            onBack={() => setView("annonser")}
            onApprove={() => {
              if (!selectedExternalAnnonce) return;
              updateAnnonce(selectedExternalAnnonce.id, { status: "Godkjent" }, { action: "Godkjent annonse" });
              setView("annonser");
            }}
            onReject={(comment) => {
              if (!selectedExternalAnnonce) return;
              updateAnnonce(
                selectedExternalAnnonce.id,
                { status: "Ikke godkjent", rejectComment: comment },
                { action: "Underkjent annonse", details: comment }
              );
              setView("annonser");
            }}
            auditLog={auditLog}
          />
        )}
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

function AnnonserView({ annonseList, onCreate, onApprove, onEdit, onOpenExternal, onEditDate }) {
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
              <th className="p-3">Sist endret av</th>
              <th className="p-3 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="border-t hover:bg-slate-50 cursor-pointer"
                onClick={() => {
                  if (a.leverandor && a.leverandor !== "Oppdrag") {
                    onOpenExternal?.(a);
                  } else {
                    onEdit(a);
                  }
                }}
              >
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
                <td className="p-3">
                  <div className="text-xs text-slate-500">{a.lastEditedBy || "-"}</div>
                  <div className="text-xs text-slate-400">{a.lastEditedAt ? formatDateTime(a.lastEditedAt) : ""}</div>
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
                            if (a.leverandor && a.leverandor !== "Oppdrag") {
                              onOpenExternal?.(a);
                            } else {
                              onEdit(a);
                            }
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

function ExternalAnnonceDetailView({ annonce, onBack, onApprove, onReject, auditLog }) {
  const [rejectComment, setRejectComment] = useState("");
  const history = (auditLog || []).filter((entry) => entry.entityId === annonce?.id);

  if (!annonce) {
    return (
      <div>
        <button className="mb-4 px-3 py-1 border rounded" onClick={onBack}>
          Tilbake
        </button>
        <div className="bg-white border rounded p-6">Ingen annonse valgt.</div>
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
          <span className="text-lg font-bold">{annonce.id}</span>
          <span className="text-sm text-slate-500 ml-2">{annonce.leverandor}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs ${statusClass(annonce.status)}`}>
            {annonce.status}
          </span>
          <button className="px-3 py-1 border rounded" onClick={() => alert("PDF lastes ned (mock).")}>
            Last ned PDF
          </button>
        </div>
      </div>
      <div className="mb-4 text-xs text-slate-500">
        Sist endret av: {annonce.lastEditedBy || "-"}
        {annonce.lastEditedAt ? ` · ${formatDateTime(annonce.lastEditedAt)}` : ""}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-white border rounded p-4 mb-4">
            <div className="text-sm text-slate-600 mb-2">Rådata</div>
            <pre className="text-xs bg-slate-50 border rounded p-3 max-h-[520px] overflow-auto whitespace-pre-wrap">
              {annonce.rawData || sampleRawData(annonce)}
            </pre>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-sm text-slate-600 mb-2">Historikk</div>
            {history.length === 0 ? (
              <div className="text-sm text-slate-500">Ingen endringer logget ennå.</div>
            ) : (
              <div className="border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left">Tidspunkt</th>
                      <th className="p-3 text-left">Bruker</th>
                      <th className="p-3 text-left">Hendelse</th>
                      <th className="p-3 text-left">Detaljer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="p-3">{formatDateTime(entry.timestamp)}</td>
                        <td className="p-3">{entry.user}</td>
                        <td className="p-3">{entry.action}</td>
                        <td className="p-3 text-slate-500">{entry.details || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white border rounded p-4 mb-4">
            <div className="text-sm text-slate-600 mb-2">PDF preview</div>
            <div className="border rounded bg-slate-50 p-4 flex items-center justify-center h-64 text-slate-400 text-sm">
              PDF forhåndsvisning (mock)
            </div>
          </div>

          <div className="bg-white border rounded p-4 mb-4">
            <div className="text-sm text-slate-600 mb-2">Digitalvisning</div>
            <div className="border rounded bg-white p-4">
              <ExternalAnnoncePreview annonce={annonce} />
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <div className="text-sm text-slate-600 mb-2">Godkjenning</div>
            <button className="w-full bg-green-600 text-white py-2 rounded mb-2" onClick={onApprove}>
              Godkjenn annonse
            </button>
            <button
              className="w-full bg-red-600 text-white py-2 rounded mb-2"
              onClick={() => {
                if (!rejectComment.trim()) {
                  alert("Legg til kommentar før du underkjenner.");
                  return;
                }
                onReject?.(rejectComment.trim());
              }}
            >
              Underkjenn annonse
            </button>
            <textarea
              className="w-full border p-2 rounded text-sm"
              rows={2}
              placeholder="Kommentar ved underkjenning"
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExternalAnnoncePreview({ annonce }) {
  return (
    <div className="border-2 border-slate-300 rounded p-4 text-center bg-white">
      <div className="text-xs text-slate-500 mb-2">{annonce.publikasjon || "Publikasjon"}</div>
      <div className="text-sm italic mb-2">Vår kjære</div>
      <div className="text-lg font-semibold">{annonce.navn || "Navn"}</div>
      <div className="text-xs text-slate-500 mt-2">{formatDateTime(annonce.publisering)}</div>
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
  symbolLibrary,
  templateConfig,
  priceList,
  customerCards,
  auditLog,
  currentAnnonceId,
}) {
  const [step, setStep] = useState(1);
  const [showSymbolBank, setShowSymbolBank] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [suggestionField, setSuggestionField] = useState(null);
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [livePreviewMode, setLivePreviewMode] = useState("digital");
  const [rejectCommentText, setRejectCommentText] = useState("");

  useEffect(() => {
    setStep(initialStep || 1);
  }, [oppdrag?.id, initialStep]);

  useEffect(() => {
    if (!ad.relativesRows || ad.relativesRows.length === 0) {
      setAd((prev) => ({
        ...prev,
        relativesRows: [{ id: "row-1", layout: "one", left: "", right: "", leftSymbol: "", rightSymbol: "" }],
      }));
    }
  }, [ad.relativesRows, setAd]);

  useEffect(() => {
    if (!ad.symbolLockId) return;
    const source = (symbolLibrary && symbolLibrary.length ? symbolLibrary : defaultSymbolLibrary()).find(
      (s) => s.id === ad.symbolLockId
    );
    if (!source) return;
    const sizeMm = ad.annonseType === "Takk" ? source.sizeThanksMm : source.sizeDeathMm;
    if (!sizeMm) return;
    setAd((prev) => ({ ...prev, symbolSize: mmToPx(sizeMm), symbolSizeLocked: true }));
  }, [ad.annonseType, ad.symbolLockId, symbolLibrary, setAd]);

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

  const templateOptions = getTemplateOptionsForPublication(
    ad.publication,
    ad.annonseType,
    templateConfig
  );
  const defaultTemplate = getDefaultTemplateForPublication(
    ad.publication,
    ad.annonseType,
    templateConfig
  );

  useEffect(() => {
    if (!templateOptions.length) return;
    if (!ad.template || !templateOptions.includes(ad.template)) {
      setAd((prev) => ({ ...prev, template: defaultTemplate || templateOptions[0] }));
    }
  }, [ad.publication, ad.annonseType, templateConfig, templateOptions, defaultTemplate, setAd]);

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

  const symbolOptions = (symbolLibrary && symbolLibrary.length ? symbolLibrary : defaultSymbolLibrary()).map(
    (s) => ({
      id: s.id || s.value,
      label: s.label || s.value,
      value: s.value || "",
      type: s.type || "text",
      src: s.src || "",
      sizeDeathMm: s.sizeDeathMm,
      sizeThanksMm: s.sizeThanksMm,
    })
  );
  const filteredSymbols = symbolOptions.filter((s) => {
    const q = symbolSearch.trim().toLowerCase();
    if (!q) return true;
    return s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q);
  });

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

  const relativeSymbolSuffix = (symbol) => {
    if (symbol === "deceased") return " ✝";
    if (symbol === "pet") return " 🐾";
    return "";
  };

  const formatRelativeName = (name, symbol) => {
    if (!name) return "";
    return `${name}${relativeSymbolSuffix(symbol)}`;
  };

  const priceRows = priceList && priceList.length ? priceList : defaultPriceList();
  const customerCardRows = customerCards && customerCards.length ? customerCards : defaultCustomerCards();
  const normalizedPublication = (ad.publication || "").trim().toLowerCase();
  const priceEntry = priceRows.find((row) => row.publication.toLowerCase() === normalizedPublication) || null;
  const priceKey = ad.annonseType === "Takk" ? "thanks" : "death";
  const basePrice = priceEntry
    ? Number(priceEntry[priceKey]?.print || 0) + Number(priceEntry[priceKey]?.digital || 0) + Number(priceEntry[priceKey]?.production || 0)
    : null;
  const normalizedAgency = (ad.agency || "").toLowerCase();
  const matchedCard =
    normalizedAgency && customerCardRows.length
      ? customerCardRows.find((card) => normalizedAgency.includes(card.name.toLowerCase()))
      : null;
  const applyDiscount = (price) => {
    if (!matchedCard) return { total: price, label: "" };
    if (matchedCard.type === "price") return { total: matchedCard.value, label: "Avtalepris" };
    if (matchedCard.type === "fixed") return { total: Math.max(0, price - matchedCard.value), label: "Avtalerabatt" };
    return { total: Math.max(0, price * (1 - matchedCard.value / 100)), label: "Avtalerabatt" };
  };
  const pricing = basePrice === null ? { total: null, label: "" } : applyDiscount(basePrice);
  const formatNok = (value) => `${Math.round(value).toLocaleString("no-NB")} kr`;

  const heartMaskSvg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M12 21s-6.716-4.674-9.388-8.296C.61 10.05 1.28 6.41 4.2 4.8c2.13-1.18 4.55-.66 5.94.8 1.39-1.46 3.81-1.98 5.94-.8 2.92 1.61 3.59 5.25 1.59 7.904C18.716 16.326 12 21 12 21z"/></svg>'
    );

  const getFrameDims = (size, shape) => {
    const base = Math.max(24, size || 24);
    if (shape === "oval") {
      return { width: Math.round(base * 1.2), height: Math.round(base * 0.8) };
    }
    return { width: base, height: base };
  };

  const getFrameStyle = (shape, size) => {
    const style = {
      width: `${size.width}px`,
      height: `${size.height}px`,
      overflow: "hidden",
      backgroundColor: "white",
      cursor: "grab",
    };
    if (shape === "circle" || shape === "oval") {
      return { ...style, borderRadius: "9999px" };
    }
    if (shape === "heart") {
      return {
        ...style,
        WebkitMaskImage: `url("${heartMaskSvg}")`,
        maskImage: `url("${heartMaskSvg}")`,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      };
    }
    return { ...style, borderRadius: "4px" };
  };

  const handleImageMouseDown = (event) => {
    if (!ad.symbolImage) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startOffsetX = ad.symbolImageOffsetX || 0;
    const startOffsetY = ad.symbolImageOffsetY || 0;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setAd((prev) => ({
        ...prev,
        symbolImageOffsetX: startOffsetX + dx,
        symbolImageOffsetY: startOffsetY + dy,
      }));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const renderTopSymbol = () => {
    if (!ad.symbolImage && !ad.symbol) return null;
    if (!ad.symbolImage) {
      return (
        <div className="mb-3 text-center" style={{ fontSize: `${ad.symbolSize || 24}px` }}>
          {ad.symbol}
        </div>
      );
    }
    const frameSize = getFrameDims(ad.symbolSize || 24, ad.symbolImageShape || "circle");
    const frameStyle = getFrameStyle(ad.symbolImageShape || "circle", frameSize);
    return (
      <div className="mb-3 flex justify-center">
        <div style={frameStyle} onMouseDown={handleImageMouseDown}>
          <img
            src={ad.symbolImage}
            alt="Symbol"
            className="block"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `translate(${ad.symbolImageOffsetX || 0}px, ${ad.symbolImageOffsetY || 0}px) scale(${ad.symbolImageScale || 1})`,
            }}
          />
        </div>
      </div>
    );
  };

  function renderPreview() {
    if (ad.annonseType === "Takk") {
      return (
        <div className="border-2 border-slate-400 rounded p-6 bg-white">
          {renderTopSymbol()}
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
        {renderTopSymbol()}
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
                    <div>{formatRelativeName(row.left, row.leftSymbol)}</div>
                    <div>{formatRelativeName(row.right, row.rightSymbol)}</div>
                  </div>
                );
              }
              return (
                <div key={row.id} className="text-center">
                  {formatRelativeName(row.left, row.leftSymbol)}
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

  const history = currentAnnonceId
    ? (auditLog || []).filter((entry) => entry.entityId === currentAnnonceId)
    : [];

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

      {history.length > 0 ? (
        <div className="bg-white border rounded p-4 mb-4">
          <div className="text-sm text-slate-600 mb-2">Historikk</div>
          <div className="border rounded">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Tidspunkt</th>
                  <th className="p-3 text-left">Bruker</th>
                  <th className="p-3 text-left">Hendelse</th>
                  <th className="p-3 text-left">Detaljer</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="p-3">{formatDateTime(entry.timestamp)}</td>
                    <td className="p-3">{entry.user}</td>
                    <td className="p-3">{entry.action}</td>
                    <td className="p-3 text-slate-500">{entry.details || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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
                  <input
                    className="w-full border p-2 rounded text-sm"
                    value={ad.symbol}
                    onChange={(e) =>
                      setAd({
                        ...ad,
                        symbol: e.target.value,
                        symbolImage: "",
                        symbolLockId: "",
                        symbolSizeLocked: false,
                      })
                    }
                  />
                  <button className="px-3 py-1 border rounded" onClick={() => setShowSymbolBank(true)}>
                    Velg
                  </button>
                </div>
              </div>
              {!ad.symbolSizeLocked && (
                <div className="col-span-6">
                  <label className="text-sm block">Symbolstørrelse</label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => {
                        setAd({ ...ad, symbolSize: Math.max(12, ad.symbolSize - 2) });
                      }}
                    >
                      -
                    </button>
                    <div className="text-sm">{ad.symbolSize}px</div>
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => {
                        setAd({ ...ad, symbolSize: Math.min(64, ad.symbolSize + 2) });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              <div className="col-span-12">
                <label className="text-sm block">Symbolbilde</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setAd({
                          ...ad,
                          symbolImage: String(reader.result || ""),
                          symbol: "",
                          symbolLockId: "",
                          symbolSizeLocked: false,
                          symbolImageScale: 1,
                          symbolImageOffsetX: 0,
                          symbolImageOffsetY: 0,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {ad.symbolImage ? (
                    <button
                      className="px-3 py-1 border rounded text-sm"
                      onClick={() =>
                        setAd({
                          ...ad,
                          symbolImage: "",
                          symbolImageScale: 1,
                          symbolImageOffsetX: 0,
                          symbolImageOffsetY: 0,
                        })
                      }
                    >
                      Fjern
                    </button>
                  ) : null}
                </div>
                <div className="text-xs text-slate-500 mt-1">Dra bildet i forhåndsvisningen for å justere utsnitt.</div>
              </div>
              {ad.symbolImage ? (
                <>
                  <div className="col-span-6">
                    <label className="text-sm block">Ramme</label>
                    <select
                      className="w-full border p-2 rounded mt-1 text-sm"
                      value={ad.symbolImageShape || "circle"}
                      onChange={(e) => setAd({ ...ad, symbolImageShape: e.target.value })}
                    >
                      <option value="square">Firkant</option>
                      <option value="circle">Sirkel</option>
                      <option value="oval">Oval</option>
                      <option value="heart">Hjerte</option>
                    </select>
                  </div>
                  <div className="col-span-6">
                    <label className="text-sm block">Zoom</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="range"
                        min="0.8"
                        max="2"
                        step="0.05"
                        value={ad.symbolImageScale || 1}
                        onChange={(e) => setAd({ ...ad, symbolImageScale: Number(e.target.value) })}
                        className="w-full"
                      />
                      <div className="text-xs w-10 text-right">{(ad.symbolImageScale || 1).toFixed(2)}x</div>
                    </div>
                    <button
                      className="mt-2 px-3 py-1 border rounded text-sm"
                      onClick={() => setAd({ ...ad, symbolImageScale: 1, symbolImageOffsetX: 0, symbolImageOffsetY: 0 })}
                    >
                      Tilbakestill utsnitt
                    </button>
                  </div>
                </>
              ) : null}
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
                        <div className="col-span-3">
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
                        <div className="col-span-1">
                          {row.layout === "one" || row.layout === "two" ? (
                            <div className="grid gap-1">
                              <select
                                className="w-full border p-2 rounded text-sm"
                                value={row.leftSymbol || ""}
                                onChange={(e) => {
                                  const next = [...ad.relativesRows];
                                  next[idx] = { ...row, leftSymbol: e.target.value };
                                  setAd({ ...ad, relativesRows: next });
                                }}
                                aria-label="Symbol venstre"
                              >
                                <option value=""></option>
                                <option value="deceased">✝</option>
                                <option value="pet">🐾</option>
                              </select>
                              {row.layout === "two" ? (
                                <select
                                  className="w-full border p-2 rounded text-sm"
                                  value={row.rightSymbol || ""}
                                  onChange={(e) => {
                                    const next = [...ad.relativesRows];
                                    next[idx] = { ...row, rightSymbol: e.target.value };
                                    setAd({ ...ad, relativesRows: next });
                                  }}
                                  aria-label="Symbol høyre"
                                >
                                  <option value=""></option>
                                  <option value="deceased">✝</option>
                                  <option value="pet">🐾</option>
                                </select>
                              ) : null}
                            </div>
                          ) : null}
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
                        relativesRows: [
                          ...(ad.relativesRows || []),
                          { id: `row-${Date.now()}`, layout: "one", left: "", right: "", leftSymbol: "", rightSymbol: "" },
                        ],
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
                        relativesRows: [
                          ...(ad.relativesRows || []),
                          { id: `row-${Date.now()}`, layout: "two", left: "", right: "", leftSymbol: "", rightSymbol: "" },
                        ],
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
                        relativesRows: [
                          ...(ad.relativesRows || []),
                          { id: `row-${Date.now()}`, layout, left: "", right: "", leftSymbol: "", rightSymbol: "" },
                        ],
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
                            relativesRows: [
                              ...(ad.relativesRows || []),
                              { id: `row-${Date.now()}`, layout: "empty", left: "", right: "", leftSymbol: "", rightSymbol: "" },
                            ],
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
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm text-slate-600">Livevisning</div>
              <div className="inline-flex border rounded overflow-hidden text-sm">
                <button
                  className={`px-3 py-1 ${livePreviewMode === "digital" ? "bg-slate-800 text-white" : "bg-white"}`}
                  onClick={() => setLivePreviewMode("digital")}
                >
                  Digital
                </button>
                <button
                  className={`px-3 py-1 ${livePreviewMode === "pdf" ? "bg-slate-800 text-white" : "bg-white"}`}
                  onClick={() => setLivePreviewMode("pdf")}
                >
                  PDF
                </button>
              </div>
            </div>
            {livePreviewMode === "pdf" ? (
              <div className="bg-slate-50 p-4 border rounded">{renderPreview()}</div>
            ) : (
              renderPreview()
            )}
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
                <span className="text-slate-600">Basepris:</span>{" "}
                {basePrice === null ? "-" : formatNok(basePrice)}
              </div>
              {matchedCard ? (
                <div>
                  <span className="text-slate-600">
                    {matchedCard.type === "price" ? "Avtalepris" : "Avtalerabatt"}:
                  </span>{" "}
                  {matchedCard.type === "percent"
                    ? `-${matchedCard.value}%`
                    : matchedCard.type === "fixed"
                    ? `-${formatNok(matchedCard.value)}`
                    : formatNok(matchedCard.value)}
                </div>
              ) : null}
              <div>
                <span className="text-slate-600">Totalbeløp inkl. mva:</span>{" "}
                {pricing.total === null ? "-" : formatNok(pricing.total)}
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
                  key={s.id}
                  className="border rounded p-2 text-lg hover:bg-slate-50"
                  onClick={() => {
                    const sizeMm = ad.annonseType === "Takk" ? s.sizeThanksMm : s.sizeDeathMm;
                    const lockedSize = sizeMm ? mmToPx(sizeMm) : ad.symbolSize;
                    if (s.type === "png") {
                      setAd({
                        ...ad,
                        symbolImage: s.src,
                        symbol: "",
                        symbolLockId: s.id,
                        symbolSize: lockedSize,
                        symbolSizeLocked: Boolean(sizeMm),
                        symbolImageScale: 1,
                        symbolImageOffsetX: 0,
                        symbolImageOffsetY: 0,
                        symbolImageShape: ad.symbolImageShape || "circle",
                      });
                    } else {
                      setAd({
                        ...ad,
                        symbol: s.value,
                        symbolImage: "",
                        symbolLockId: s.id,
                        symbolSize: lockedSize,
                        symbolSizeLocked: Boolean(sizeMm),
                      });
                    }
                    setShowSymbolBank(false);
                    setSymbolSearch("");
                  }}
                >
                  {s.type === "png" ? (
                    <img src={s.src} alt={s.label} className="h-8 w-8 object-contain mx-auto" />
                  ) : (
                    s.value
                  )}
                  <div className="text-[10px] text-slate-500 mt-1 text-center">{s.label}</div>
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

function AdminUsersView({
  currentUser,
  symbolLibrary,
  setSymbolLibrary,
  templateConfig,
  setTemplateConfig,
  priceList,
  setPriceList,
  customerCards,
  setCustomerCards,
  auditLog,
  onLogAction,
}) {
  const roleOptions = ["Godkjenner", "Produsent", "Administrator", "Superadministrator"];
  const regionOptions = ["Midt", "Nord", "Sør", "Vest", "Øst"];
  const initialUsers = [
    { id: "u1", name: "Torgeir Roness", region: "Midt", role: "Superadministrator", username: currentUser, email: "torgeir.roness@adresseavisen.no", password: "" },
    { id: "u2", name: "Marit Nordmann", region: "Midt", role: "Produsent", email: "marit.nordmann@adresseavisen.no", password: "" },
    { id: "u3", name: "Frank Hansen", region: "Sør", role: "Godkjenner", email: "frank.hansen@adresseavisen.no", password: "" },
    { id: "u4", name: "Sigrid Løken", region: "Øst", role: "Administrator", email: "sigrid.loken@adresseavisen.no", password: "" },
    { id: "u5", name: "Ellen Skaare", region: "Vest", role: "Produsent", email: "ellen.skaare@adresseavisen.no", password: "" },
  ];
  const [users, setUsers] = useState(() => initialUsers);
  const [savedUsers, setSavedUsers] = useState(() => initialUsers);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    region: "Midt",
    role: "Godkjenner",
  });
  const [symbolSearch, setSymbolSearch] = useState("");
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [showSymbolEditModal, setShowSymbolEditModal] = useState(false);
  const [editingSymbolId, setEditingSymbolId] = useState(null);
  const [symbolForm, setSymbolForm] = useState({ label: "", file: null, preview: "" });
  const [symbolEditForm, setSymbolEditForm] = useState({ label: "", sizeDeathMm: 18, sizeThanksMm: 16 });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingMediahouseKey, setEditingMediahouseKey] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    deathTemplates: [],
    thanksTemplates: [],
    defaultDeath: "",
    defaultThanks: "",
  });
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [previewEditType, setPreviewEditType] = useState(null);
  const [templateStyleForm, setTemplateStyleForm] = useState({
    fontFamily: "Times New Roman",
    fontSizePt: 12,
    marginTopMm: 8,
    marginBottomMm: 8,
  });
  const currentUserRecord =
    users.find((user) => user.username === currentUser) || { role: "Godkjenner", region: "Midt" };
  const isSuperAdmin = currentUserRecord.role === "Superadministrator";
  const isAdmin = currentUserRecord.role === "Administrator";
  const isProducer = currentUserRecord.role === "Produsent";
  const isApprover = currentUserRecord.role === "Godkjenner";
  const canManageUsers = isSuperAdmin || isAdmin;
  const [adminTab, setAdminTab] = useState("brukere");
  const [logSearch, setLogSearch] = useState("");
  const safeSymbolLibrary = symbolLibrary && symbolLibrary.length ? symbolLibrary : defaultSymbolLibrary();
  const safeTemplateConfig = templateConfig && templateConfig.mediahouses ? templateConfig : defaultTemplateConfig();
  const safePriceList = priceList && priceList.length ? priceList : defaultPriceList();
  const safeCustomerCards = customerCards && customerCards.length ? customerCards : defaultCustomerCards();
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(users) !== JSON.stringify(savedUsers),
    [users, savedUsers]
  );

  function canEditUser(user) {
    if (isSuperAdmin) return true;
    if (isAdmin && user.region === currentUserRecord.region) return true;
    return false;
  }

  function openCreateUser() {
    if (!canManageUsers) return;
    setEditingUserId(null);
    setUserForm({
      name: "",
      email: "",
      password: "",
      region: isAdmin ? currentUserRecord.region : "Midt",
      role: "Godkjenner",
    });
    setShowUserModal(true);
  }

  function openEditUser(user) {
    if (!canEditUser(user)) return;
    setEditingUserId(user.id);
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      region: user.region || "Midt",
      role: user.role || "Godkjenner",
    });
    setShowUserModal(true);
  }

  function handleSaveUser() {
    if (!canManageUsers) return;
    if (editingUserId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUserId
            ? {
                ...u,
                name: userForm.name || u.name,
                email: userForm.email,
                password: userForm.password || u.password,
                region: userForm.region,
                role: userForm.role,
              }
            : u
        )
      );
    } else {
      const id = `u-${Math.random().toString(36).slice(2, 8)}`;
      setUsers((prev) => [
        ...prev,
        {
          id,
          name: userForm.name || "Ny bruker",
          email: userForm.email,
          password: userForm.password,
          region: userForm.region,
          role: userForm.role,
        },
      ]);
    }
    onLogAction?.({
      module: "Administrasjon",
      entity: "Bruker",
      entityId: editingUserId || "ny",
      action: editingUserId ? "Oppdatert bruker" : "Opprettet bruker",
      details: `${userForm.name || "Ny bruker"} (${userForm.role})`,
    });
    setShowUserModal(false);
  }

  function handleSaveChanges() {
    if (!canManageUsers) return;
    setSavedUsers(users);
  }

  function handlePriceChange(rowId, group, field, value) {
    if (!isSuperAdmin) return;
    setPriceList((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, [group]: { ...row[group], [field]: Number(value) } }
          : row
      )
    );
  }

  function handleCustomerCardChange(cardId, field, value) {
    if (!isSuperAdmin) return;
    setCustomerCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, [field]: value } : card))
    );
  }

  function handleAddCustomerCard() {
    if (!isSuperAdmin) return;
    setCustomerCards((prev) => [
      ...prev,
      {
        id: `card-${Math.random().toString(36).slice(2, 8)}`,
        name: "",
        region: currentUserRecord.region || "Midt",
        type: "percent",
        value: 0,
      },
    ]);
  }

  function openAddSymbol() {
    if (!canManageUsers) return;
    setSymbolForm({ label: "", file: null, preview: "" });
    setShowSymbolModal(true);
  }

  function openEditSymbol(symbol) {
    if (!canManageUsers) return;
    setEditingSymbolId(symbol.id);
    setSymbolEditForm({
      label: symbol.label || "",
      sizeDeathMm: symbol.sizeDeathMm ?? 18,
      sizeThanksMm: symbol.sizeThanksMm ?? 16,
    });
    setShowSymbolEditModal(true);
  }

  function handleSaveSymbolEdit() {
    if (!canManageUsers || !editingSymbolId) return;
    setSymbolLibrary((prev) =>
      (prev || []).map((sym) =>
        sym.id === editingSymbolId
          ? {
              ...sym,
              label: symbolEditForm.label.trim() || sym.label,
              sizeDeathMm: Number(symbolEditForm.sizeDeathMm) || sym.sizeDeathMm || 18,
              sizeThanksMm: Number(symbolEditForm.sizeThanksMm) || sym.sizeThanksMm || 16,
            }
          : sym
      )
    );
    onLogAction?.({
      module: "Administrasjon",
      entity: "Symbol",
      entityId: editingSymbolId,
      action: "Oppdatert symbol",
      details: symbolEditForm.label,
    });
    setShowSymbolEditModal(false);
  }

  function openTemplateEditor(mediahouseKey) {
    if (!canManageUsers) return;
    const entry = safeTemplateConfig.mediahouses[mediahouseKey];
    if (!entry) return;
    setEditingMediahouseKey(mediahouseKey);
    setTemplateForm({
      deathTemplates: entry.deathTemplates || [],
      thanksTemplates: entry.thanksTemplates || [],
      defaultDeath: entry.defaultDeath || "",
      defaultThanks: entry.defaultThanks || "",
    });
    setShowTemplateModal(true);
  }

  function openTemplatePreview(mediahouseKey) {
    const entry = safeTemplateConfig.mediahouses[mediahouseKey];
    if (!entry) return;
    setEditingMediahouseKey(mediahouseKey);
    setShowTemplatePreview(true);
    setPreviewEditType(null);
    setTemplateStyleForm({
      fontFamily: entry.style?.fontFamily || "Times New Roman",
      fontSizePt: entry.style?.fontSizePt ?? 12,
      marginTopMm: entry.style?.marginTopMm ?? 8,
      marginBottomMm: entry.style?.marginBottomMm ?? 8,
    });
  }

  function handleSaveTemplateConfig() {
    if (!canManageUsers || !editingMediahouseKey) return;
    setTemplateConfig((prev) => {
      const base = prev && prev.mediahouses ? prev : defaultTemplateConfig();
      return {
        ...base,
        mediahouses: {
          ...base.mediahouses,
          [editingMediahouseKey]: {
            ...base.mediahouses[editingMediahouseKey],
            deathTemplates: templateForm.deathTemplates.length
              ? templateForm.deathTemplates
              : base.mediahouses[editingMediahouseKey].deathTemplates,
            thanksTemplates: templateForm.thanksTemplates.length
              ? templateForm.thanksTemplates
              : base.mediahouses[editingMediahouseKey].thanksTemplates,
            defaultDeath: templateForm.defaultDeath || base.mediahouses[editingMediahouseKey].defaultDeath,
            defaultThanks: templateForm.defaultThanks || base.mediahouses[editingMediahouseKey].defaultThanks,
          },
        },
      };
    });
    setShowTemplateModal(false);
  }

  function handleSaveSymbol() {
    if (!canManageUsers) return;
    const label = symbolForm.label.trim();
    if (!label || !symbolForm.file || !symbolForm.preview) return;
    setSymbolLibrary((prev) => [
      ...(prev && prev.length ? prev : defaultSymbolLibrary()),
      {
        id: `sym-${Math.random().toString(36).slice(2, 8)}`,
        label,
        type: "png",
        src: symbolForm.preview,
        filename: symbolForm.file?.name || "symbol.png",
      },
    ]);
    onLogAction?.({
      module: "Administrasjon",
      entity: "Symbol",
      entityId: label,
      action: "Opprettet symbol",
      details: symbolForm.file?.name || "symbol.png",
    });
    setShowSymbolModal(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold">Administrasjon</h3>
        <div className="flex items-center gap-2">
          <button
            className={`px-4 py-2 rounded ${canManageUsers && hasUnsavedChanges ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
            onClick={handleSaveChanges}
            disabled={!canManageUsers || !hasUnsavedChanges}
          >
            Lagre endringer
          </button>
        </div>
      </div>

      <div className="bg-white border rounded shadow-sm">
        <div className="border-b p-3 flex gap-2 text-sm">
          <button
            className={`px-3 py-1 rounded ${adminTab === "brukere" ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
            onClick={() => setAdminTab("brukere")}
          >
            Brukerstyring
          </button>
          <button
            className={`px-3 py-1 rounded ${adminTab === "maler" ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
            onClick={() => setAdminTab("maler")}
          >
            Maler
          </button>
          <button
            className={`px-3 py-1 rounded ${adminTab === "integrasjoner" ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
            onClick={() => setAdminTab("integrasjoner")}
          >
            Integrasjoner
          </button>
          <button
            className={`px-3 py-1 rounded ${adminTab === "symboler" ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
            onClick={() => setAdminTab("symboler")}
          >
            Symbolbibliotek
          </button>
          <button
            className={`px-3 py-1 rounded ${adminTab === "prisliste" ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
            onClick={() => setAdminTab("prisliste")}
          >
            Prisliste
          </button>
          <button
            className={`px-3 py-1 rounded ${adminTab === "logg" ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`}
            onClick={() => setAdminTab("logg")}
          >
            Endringslogg
          </button>
        </div>

        {adminTab === "brukere" && (
          <div>
            <div className="p-3 border-b flex justify-end">
              <button
                className={`px-4 py-2 rounded ${canManageUsers ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                onClick={openCreateUser}
                disabled={!canManageUsers}
              >
                Opprett ny bruker
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Navn</th>
                  <th className="p-3 text-left">Mediehusregion</th>
                  <th className="p-3 text-left">Rolle</th>
                  <th className="p-3 text-left">Handling</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-medium">{user.name}</div>
                      {user.username === currentUser ? (
                        <div className="text-xs text-slate-500">Innlogget</div>
                      ) : null}
                    </td>
                    <td className="p-3">{user.region}</td>
                    <td className="p-3">
                      <select
                        className="border p-2 rounded text-sm"
                        value={user.role}
                        disabled={!canEditUser(user)}
                        onChange={(e) => {
                          const nextRole = e.target.value;
                          setUsers((prev) =>
                            prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
                          );
                          onLogAction?.({
                            module: "Administrasjon",
                            entity: "Bruker",
                            entityId: user.id,
                            action: "Endret rolle",
                            details: `${user.role} -> ${nextRole}`,
                          });
                        }}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <button
                        className={`px-3 py-1 border rounded text-sm ${canEditUser(user) ? "" : "text-slate-400 cursor-not-allowed"}`}
                        onClick={() => openEditUser(user)}
                        disabled={!canEditUser(user)}
                      >
                        Rediger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {adminTab === "maler" && (
          <div className="p-6">
            {isSuperAdmin || isAdmin ? (
              <div>
                <div className="text-sm text-slate-600 mb-3">Velg mediehus for å justere maler.</div>
                <div className="border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-left">Mediehus</th>
                        <th className="p-3 text-left">Standard (Død)</th>
                        <th className="p-3 text-left">Standard (Takk)</th>
                        <th className="p-3 text-left">Handling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(safeTemplateConfig.mediahouses).map((key) => {
                        const entry = safeTemplateConfig.mediahouses[key];
                        return (
                          <tr key={key} className="border-t hover:bg-slate-50">
                            <td className="p-3">{entry.name}</td>
                            <td className="p-3">{entry.defaultDeath}</td>
                            <td className="p-3">{entry.defaultThanks}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  className={`px-3 py-1 border rounded text-sm ${canManageUsers ? "" : "text-slate-400 cursor-not-allowed"}`}
                                  onClick={() => openTemplateEditor(key)}
                                  disabled={!canManageUsers}
                                >
                                  Tilgjengelige maler
                                </button>
                                <button
                                  className="px-3 py-1 border rounded text-sm"
                                  onClick={() => openTemplatePreview(key)}
                                >
                                  Vis maler
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Ingen tilgang til maler.</div>
            )}
          </div>
        )}

        {adminTab === "integrasjoner" && (
          <div className="p-6">
            {isSuperAdmin ? (
              <div className="text-sm text-slate-600">Integrasjoner kommer her (CA/ADpoint, leverandører).</div>
            ) : (
              <div className="text-sm text-slate-500">Ingen tilgang til integrasjoner.</div>
            )}
          </div>
        )}

        {adminTab === "symboler" && (
          <div className="p-6">
            {isSuperAdmin || isAdmin ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-slate-600">Symbolbibliotek</div>
                  <button
                    className={`px-3 py-1 rounded ${canManageUsers ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                    onClick={openAddSymbol}
                    disabled={!canManageUsers}
                  >
                    Legg til symbol
                  </button>
                </div>
                <div className="mb-3">
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder="Søk symbol"
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {safeSymbolLibrary
                    .filter((symbol) => {
                      const q = symbolSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        symbol.label.toLowerCase().includes(q) ||
                        (symbol.value || "").toLowerCase().includes(q) ||
                        (symbol.filename || "").toLowerCase().includes(q)
                      );
                    })
                    .map((symbol) => (
                    <div
                      key={symbol.id}
                      className={`border rounded p-3 flex items-center gap-3 ${canManageUsers ? "hover:bg-slate-50 cursor-pointer" : ""}`}
                      onClick={() => openEditSymbol(symbol)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openEditSymbol(symbol);
                      }}
                    >
                      <div className="text-2xl">
                        {symbol.type === "png" ? (
                          <img src={symbol.src} alt={symbol.label} className="h-8 w-8 object-contain" />
                        ) : (
                          symbol.value
                        )}
                      </div>
                      <div className="text-sm flex-1">
                        <div className="font-medium">{symbol.label}</div>
                        <div className="text-xs text-slate-500">{symbol.type === "png" ? symbol.filename : symbol.value}</div>
                      </div>
                      <button
                        className={`px-2 py-1 text-xs border rounded ${canManageUsers ? "text-red-600" : "text-slate-400 cursor-not-allowed"}`}
                        onClick={() => {
                          if (!canManageUsers) return;
                          if (confirm("Slett symbol?")) {
                            setSymbolLibrary((prev) => (prev || []).filter((s) => s.id !== symbol.id));
                            onLogAction?.({
                              module: "Administrasjon",
                              entity: "Symbol",
                              entityId: symbol.id,
                              action: "Slettet symbol",
                              details: symbol.label,
                            });
                          }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClickCapture={(e) => e.stopPropagation()}
                        disabled={!canManageUsers}
                      >
                        Slett
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Ingen tilgang til symbolbibliotek.</div>
            )}
          </div>
        )}
        {adminTab === "prisliste" && (
          <div className="p-6 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Prisliste per publikasjon</h4>
                <div className="text-xs text-slate-500">
                  {isSuperAdmin ? "Redigerbar for superadministrator." : "Kun superadministrator kan redigere."}
                </div>
              </div>
              <div className="border rounded overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left">Region</th>
                      <th className="p-2 text-left">Produktkode</th>
                      <th className="p-2 text-left">Media ID</th>
                      <th className="p-2 text-left">Publikasjon</th>
                      <th className="p-2 text-center" colSpan={3}>
                        Dødsannonser
                      </th>
                      <th className="p-2 text-center" colSpan={3}>
                        Takkeannonser
                      </th>
                    </tr>
                    <tr className="bg-slate-50">
                      <th className="p-2" />
                      <th className="p-2" />
                      <th className="p-2" />
                      <th className="p-2" />
                      <th className="p-2">Print</th>
                      <th className="p-2">Digital</th>
                      <th className="p-2">Produksjon</th>
                      <th className="p-2">Print</th>
                      <th className="p-2">Digital</th>
                      <th className="p-2">Produksjon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safePriceList.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-2">{row.region}</td>
                        <td className="p-2">{row.productCode}</td>
                        <td className="p-2">{row.mediaId}</td>
                        <td className="p-2">{row.publication}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-24 border p-1 rounded text-sm"
                            value={row.death.print}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handlePriceChange(row.id, "death", "print", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-24 border p-1 rounded text-sm"
                            value={row.death.digital}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handlePriceChange(row.id, "death", "digital", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-24 border p-1 rounded text-sm"
                            value={row.death.production}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handlePriceChange(row.id, "death", "production", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-24 border p-1 rounded text-sm"
                            value={row.thanks.print}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handlePriceChange(row.id, "thanks", "print", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-24 border p-1 rounded text-sm"
                            value={row.thanks.digital}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handlePriceChange(row.id, "thanks", "digital", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-24 border p-1 rounded text-sm"
                            value={row.thanks.production}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handlePriceChange(row.id, "thanks", "production", e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Kundekort (begravelsesbyrå)</h4>
                <button
                  className={`px-3 py-1 rounded text-sm ${isSuperAdmin ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                  onClick={handleAddCustomerCard}
                  disabled={!isSuperAdmin}
                >
                  Legg til kundekort
                </button>
              </div>
              <div className="text-xs text-slate-500 mb-2">
                Matcher på byrånavn i annonsen og brukes ved prisberegning.
              </div>
              <div className="border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left">Byrå</th>
                      <th className="p-2 text-left">Region</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Verdi</th>
                      <th className="p-2 text-left">Handling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeCustomerCards.map((card) => (
                      <tr key={card.id} className="border-t">
                        <td className="p-2">
                          <input
                            className="w-full border p-1 rounded text-sm"
                            value={card.name}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handleCustomerCardChange(card.id, "name", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <select
                            className="w-full border p-1 rounded text-sm"
                            value={card.region}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handleCustomerCardChange(card.id, "region", e.target.value)}
                          >
                            {regionOptions.map((region) => (
                              <option key={region} value={region}>
                                {region}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            className="w-full border p-1 rounded text-sm"
                            value={card.type}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handleCustomerCardChange(card.id, "type", e.target.value)}
                          >
                            <option value="percent">Rabatt %</option>
                            <option value="fixed">Rabatt kr</option>
                            <option value="price">Avtalepris kr</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-28 border p-1 rounded text-sm"
                            value={card.value}
                            disabled={!isSuperAdmin}
                            onChange={(e) => handleCustomerCardChange(card.id, "value", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2">
                          <button
                            className={`px-2 py-1 border rounded text-xs ${isSuperAdmin ? "text-red-600" : "text-slate-400 cursor-not-allowed"}`}
                            onClick={() => {
                              if (!isSuperAdmin) return;
                              setCustomerCards((prev) => prev.filter((c) => c.id !== card.id));
                            }}
                            disabled={!isSuperAdmin}
                          >
                            Slett
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {adminTab === "logg" && (
          <div className="p-6">
            <div className="mb-3">
              <input
                className="w-full border p-2 rounded text-sm"
                placeholder="Søk i endringslogg"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>
            <div className="border rounded">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left">Tidspunkt</th>
                    <th className="p-3 text-left">Bruker</th>
                    <th className="p-3 text-left">Modul</th>
                    <th className="p-3 text-left">Hendelse</th>
                    <th className="p-3 text-left">Detaljer</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditLog || [])
                    .filter((entry) => {
                      const q = logSearch.trim().toLowerCase();
                      if (!q) return true;
                      const hay = `${entry.user} ${entry.module} ${entry.action} ${entry.details || ""}`.toLowerCase();
                      return hay.includes(q);
                    })
                    .map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="p-3">{formatDateTime(entry.timestamp)}</td>
                        <td className="p-3">{entry.user}</td>
                        <td className="p-3">{entry.module}</td>
                        <td className="p-3">{entry.action}</td>
                        <td className="p-3 text-slate-500">{entry.details || "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {(!auditLog || auditLog.length === 0) && (
                <div className="p-3 text-sm text-slate-500">Ingen endringer logget ennå.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingUserId ? "Rediger bruker" : "Opprett ny bruker"}</h4>
              <button className="px-2 py-1 border rounded" onClick={() => setShowUserModal(false)}>
                Lukk
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <label className="text-sm">Navn</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={userForm.name}
                  disabled={!canManageUsers}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
              </div>
              <div className="col-span-12">
                <label className="text-sm">Innloggingsepost</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={userForm.email}
                  disabled={!canManageUsers}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>
              <div className="col-span-12">
                <label className="text-sm">Passord</label>
                <input
                  type="password"
                  className="w-full border p-2 rounded mt-1"
                  value={userForm.password}
                  disabled={!canManageUsers}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>
              <div className="col-span-6">
                <label className="text-sm">Mediehusregion</label>
                <select
                  className="w-full border p-2 rounded mt-1 text-sm"
                  value={userForm.region}
                  disabled={!canManageUsers || isAdmin}
                  onChange={(e) => setUserForm({ ...userForm, region: e.target.value })}
                >
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-6">
                <label className="text-sm">Rolle</label>
                <select
                  className="w-full border p-2 rounded mt-1 text-sm"
                  value={userForm.role}
                  disabled={!canManageUsers}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setShowUserModal(false)}>
                Avbryt
              </button>
              <button
                className={`px-3 py-1 rounded ${canManageUsers ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                onClick={handleSaveUser}
                disabled={!canManageUsers}
              >
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {showSymbolModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Legg til symbol</h4>
              <button className="px-2 py-1 border rounded" onClick={() => setShowSymbolModal(false)}>
                Lukk
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <label className="text-sm">Navn</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={symbolForm.label}
                  onChange={(e) => setSymbolForm({ ...symbolForm, label: e.target.value })}
                />
              </div>
              <div className="col-span-12">
                <label className="text-sm">Symbol (PNG)</label>
                <input
                  type="file"
                  accept="image/png"
                  className="w-full border p-2 rounded mt-1"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) {
                      setSymbolForm({ ...symbolForm, file: null, preview: "" });
                      return;
                    }
                    const preview = URL.createObjectURL(file);
                    setSymbolForm({ ...symbolForm, file, preview });
                  }}
                />
                {symbolForm.preview ? (
                  <div className="mt-2 border rounded p-2 inline-flex items-center gap-2">
                    <img src={symbolForm.preview} alt="Forhåndsvisning" className="h-10 w-10 object-contain" />
                    <div className="text-xs text-slate-500">{symbolForm.file?.name || "symbol.png"}</div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setShowSymbolModal(false)}>
                Avbryt
              </button>
              <button
                className={`px-3 py-1 rounded ${canManageUsers ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                onClick={handleSaveSymbol}
                disabled={!canManageUsers}
              >
                Legg til
              </button>
            </div>
          </div>
        </div>
      )}

      {showSymbolEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Rediger symbol</h4>
              <button className="px-2 py-1 border rounded" onClick={() => setShowSymbolEditModal(false)}>
                Lukk
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <label className="text-sm">Navn</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  value={symbolEditForm.label}
                  onChange={(e) => setSymbolEditForm({ ...symbolEditForm, label: e.target.value })}
                />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="text-sm">Størrelse dødsannonse (mm)</label>
                <input
                  type="number"
                  min="8"
                  className="w-full border p-2 rounded mt-1"
                  value={symbolEditForm.sizeDeathMm}
                  onChange={(e) => setSymbolEditForm({ ...symbolEditForm, sizeDeathMm: e.target.value })}
                />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="text-sm">Størrelse takkeannonse (mm)</label>
                <input
                  type="number"
                  min="8"
                  className="w-full border p-2 rounded mt-1"
                  value={symbolEditForm.sizeThanksMm}
                  onChange={(e) => setSymbolEditForm({ ...symbolEditForm, sizeThanksMm: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <div className="text-xs text-slate-500 mb-2">Dødsannonse (topp)</div>
                <div className="border rounded p-4 bg-white">
                  <div className="flex flex-col items-center">
                    {(() => {
                      const sym = safeSymbolLibrary.find((s) => s.id === editingSymbolId);
                      const sizePx = mmToPx(Number(symbolEditForm.sizeDeathMm) || 18);
                      return sym?.type === "png" ? (
                        <img
                          src={sym.src}
                          alt={sym.label}
                          style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
                          className="object-contain"
                        />
                      ) : (
                        <div style={{ fontSize: `${sizePx}px` }}>{sym?.value}</div>
                      );
                    })()}
                    <div className="text-xs italic mt-2">Vår kjære</div>
                    <div className="text-sm font-semibold">Kari Nordmann</div>
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="text-xs text-slate-500 mb-2">Takkeannonse (topp)</div>
                <div className="border rounded p-4 bg-white">
                  <div className="flex flex-col items-center">
                    {(() => {
                      const sym = safeSymbolLibrary.find((s) => s.id === editingSymbolId);
                      const sizePx = mmToPx(Number(symbolEditForm.sizeThanksMm) || 16);
                      return sym?.type === "png" ? (
                        <img
                          src={sym.src}
                          alt={sym.label}
                          style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
                          className="object-contain"
                        />
                      ) : (
                        <div style={{ fontSize: `${sizePx}px` }}>{sym?.value}</div>
                      );
                    })()}
                    <div className="text-sm font-semibold mt-2">Hjertelig takk</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setShowSymbolEditModal(false)}>
                Avbryt
              </button>
              <button
                className={`px-3 py-1 rounded ${canManageUsers ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                onClick={handleSaveSymbolEdit}
                disabled={!canManageUsers}
              >
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Rediger maler</h4>
              <button className="px-2 py-1 border rounded" onClick={() => setShowTemplateModal(false)}>
                Lukk
              </button>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-6">
                <div className="font-semibold mb-2">Dødsannonser</div>
                <div className="space-y-2">
                  {defaultTemplateConfig().defaults.death.map((t) => (
                    <label key={t} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={templateForm.deathTemplates.includes(t)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...templateForm.deathTemplates, t]
                            : templateForm.deathTemplates.filter((x) => x !== t);
                          setTemplateForm({ ...templateForm, deathTemplates: next });
                        }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="text-sm">Standard mal</label>
                  <select
                    className="w-full border p-2 rounded mt-1 text-sm"
                    value={templateForm.defaultDeath}
                    onChange={(e) => setTemplateForm({ ...templateForm, defaultDeath: e.target.value })}
                  >
                    {templateForm.deathTemplates.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-span-12 md:col-span-6">
                <div className="font-semibold mb-2">Takkeannonser</div>
                <div className="space-y-2">
                  {defaultTemplateConfig().defaults.thanks.map((t) => (
                    <label key={t} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={templateForm.thanksTemplates.includes(t)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...templateForm.thanksTemplates, t]
                            : templateForm.thanksTemplates.filter((x) => x !== t);
                          setTemplateForm({ ...templateForm, thanksTemplates: next });
                        }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="text-sm">Standard mal</label>
                  <select
                    className="w-full border p-2 rounded mt-1 text-sm"
                    value={templateForm.defaultThanks}
                    onChange={(e) => setTemplateForm({ ...templateForm, defaultThanks: e.target.value })}
                  >
                    {templateForm.thanksTemplates.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setShowTemplateModal(false)}>
                Avbryt
              </button>
              <button
                className={`px-3 py-1 rounded ${canManageUsers ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                onClick={handleSaveTemplateConfig}
                disabled={!canManageUsers}
              >
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplatePreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-4xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Maler for mediehus</h4>
              <button className="px-2 py-1 border rounded" onClick={() => setShowTemplatePreview(false)}>
                Lukk
              </button>
            </div>

            {editingMediahouseKey ? (
              <>
                <div className="text-sm text-slate-600 mb-4">
                  {safeTemplateConfig.mediahouses[editingMediahouseKey]?.name}
                </div>
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 md:col-span-6">
                    <div className="text-sm font-semibold mb-2">Dødsannonse — Digital</div>
                    <button
                      className={`w-full text-left border rounded p-4 bg-white ${canManageUsers ? "hover:bg-slate-50" : ""}`}
                      onClick={() => setPreviewEditType("death")}
                      disabled={!canManageUsers}
                    >
                      <div className="text-xs text-slate-500 mb-2">Standard: {safeTemplateConfig.mediahouses[editingMediahouseKey]?.defaultDeath}</div>
                      <div
                        className="border-2 border-slate-300 rounded p-4 text-center"
                        style={{
                          fontFamily: templateStyleForm.fontFamily,
                          fontSize: `${ptToPx(templateStyleForm.fontSizePt)}px`,
                          paddingTop: `${mmToPx(templateStyleForm.marginTopMm)}px`,
                          paddingBottom: `${mmToPx(templateStyleForm.marginBottomMm)}px`,
                        }}
                      >
                        <div className="text-sm italic mb-2">Vår kjære</div>
                        <div className="text-lg font-semibold">Kari Nordmann</div>
                        <div className="text-xs text-slate-500 mt-2">Digital visning</div>
                      </div>
                    </button>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="text-sm font-semibold mb-2">Dødsannonse — Print</div>
                    <button
                      className={`w-full text-left border rounded p-4 bg-white ${canManageUsers ? "hover:bg-slate-50" : ""}`}
                      onClick={() => setPreviewEditType("death")}
                      disabled={!canManageUsers}
                    >
                      <div className="text-xs text-slate-500 mb-2">Standard: {safeTemplateConfig.mediahouses[editingMediahouseKey]?.defaultDeath}</div>
                      <div
                        className="border-2 border-slate-300 rounded p-4 text-center"
                        style={{
                          fontFamily: templateStyleForm.fontFamily,
                          fontSize: `${ptToPx(templateStyleForm.fontSizePt)}px`,
                          paddingTop: `${mmToPx(templateStyleForm.marginTopMm)}px`,
                          paddingBottom: `${mmToPx(templateStyleForm.marginBottomMm)}px`,
                        }}
                      >
                        <div className="text-xs text-slate-500 mb-1">Print visning</div>
                        <div className="text-lg font-semibold">Kari Nordmann</div>
                      </div>
                    </button>
                  </div>
                  {previewEditType === "death" ? (
                    <div className="col-span-12">
                      <div className="text-sm font-semibold mb-2">Juster mal (Dødsannonse)</div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6">
                          <label className="text-sm">Font</label>
                          <input
                            className="w-full border p-2 rounded mt-1 text-sm"
                            value={templateStyleForm.fontFamily}
                            onChange={(e) => setTemplateStyleForm({ ...templateStyleForm, fontFamily: e.target.value })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-sm">Fontstørrelse (pt)</label>
                          <input
                            type="number"
                            min="8"
                            className="w-full border p-2 rounded mt-1 text-sm"
                            value={templateStyleForm.fontSizePt}
                            onChange={(e) => setTemplateStyleForm({ ...templateStyleForm, fontSizePt: e.target.value })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-sm">Margin topp (mm)</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full border p-2 rounded mt-1 text-sm"
                            value={templateStyleForm.marginTopMm}
                            onChange={(e) => setTemplateStyleForm({ ...templateStyleForm, marginTopMm: e.target.value })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-sm">Margin bunn (mm)</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full border p-2 rounded mt-1 text-sm"
                            value={templateStyleForm.marginBottomMm}
                            onChange={(e) => setTemplateStyleForm({ ...templateStyleForm, marginBottomMm: e.target.value })}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-3 flex items-end">
                          <button
                            className="px-3 py-2 bg-slate-800 text-white rounded text-sm w-full"
                            onClick={() => {
                              setTemplateConfig((prev) => {
                                const base = prev && prev.mediahouses ? prev : defaultTemplateConfig();
                                return {
                                  ...base,
                                  mediahouses: {
                                    ...base.mediahouses,
                                    [editingMediahouseKey]: {
                                      ...base.mediahouses[editingMediahouseKey],
                                      style: {
                                        fontFamily: templateStyleForm.fontFamily,
                                        fontSizePt: Number(templateStyleForm.fontSizePt) || 12,
                                        marginTopMm: Number(templateStyleForm.marginTopMm) || 0,
                                        marginBottomMm: Number(templateStyleForm.marginBottomMm) || 0,
                                      },
                                    },
                                  },
                                };
                              });
                              onLogAction?.({
                                module: "Administrasjon",
                                entity: "Maler",
                                entityId: editingMediahouseKey,
                                action: "Oppdatert malstil",
                                details: `${templateStyleForm.fontFamily}, ${templateStyleForm.fontSizePt}pt`,
                              });
                            }}
                          >
                            Lagre endringer
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="col-span-12 md:col-span-6">
                    <div className="text-sm font-semibold mb-2">Takkeannonse — Digital</div>
                    <button
                      className={`w-full text-left border rounded p-4 bg-white ${canManageUsers ? "hover:bg-slate-50" : ""}`}
                      onClick={() => setPreviewEditType("thanks")}
                      disabled={!canManageUsers}
                    >
                      <div className="text-xs text-slate-500 mb-2">Standard: {safeTemplateConfig.mediahouses[editingMediahouseKey]?.defaultThanks}</div>
                      <div
                        className="border-2 border-slate-300 rounded p-4 text-center"
                        style={{
                          fontFamily: templateStyleForm.fontFamily,
                          fontSize: `${ptToPx(templateStyleForm.fontSizePt)}px`,
                          paddingTop: `${mmToPx(templateStyleForm.marginTopMm)}px`,
                          paddingBottom: `${mmToPx(templateStyleForm.marginBottomMm)}px`,
                        }}
                      >
                        <div className="text-lg font-semibold">Hjertelig takk</div>
                        <div className="text-xs text-slate-500 mt-2">Digital visning</div>
                      </div>
                    </button>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="text-sm font-semibold mb-2">Takkeannonse — Print</div>
                    <button
                      className={`w-full text-left border rounded p-4 bg-white ${canManageUsers ? "hover:bg-slate-50" : ""}`}
                      onClick={() => setPreviewEditType("thanks")}
                      disabled={!canManageUsers}
                    >
                      <div className="text-xs text-slate-500 mb-2">Standard: {safeTemplateConfig.mediahouses[editingMediahouseKey]?.defaultThanks}</div>
                      <div
                        className="border-2 border-slate-300 rounded p-4 text-center"
                        style={{
                          fontFamily: templateStyleForm.fontFamily,
                          fontSize: `${ptToPx(templateStyleForm.fontSizePt)}px`,
                          paddingTop: `${mmToPx(templateStyleForm.marginTopMm)}px`,
                          paddingBottom: `${mmToPx(templateStyleForm.marginBottomMm)}px`,
                        }}
                      >
                        <div className="text-lg font-semibold">Hjertelig takk</div>
                        <div className="text-xs text-slate-500 mt-2">Print visning</div>
                      </div>
                    </button>
                  </div>
                  {previewEditType === "thanks" ? (
                    <div className="col-span-12">
                      <div className="text-sm font-semibold mb-2">Juster mal (Takkeannonse)</div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6">
                          <label className="text-sm">Font</label>
                          <input
                            className="w-full border p-2 rounded mt-1 text-sm"
                            value={templateStyleForm.fontFamily}
                            onChange={(e) => setTemplateStyleForm({ ...templateStyleForm, fontFamily: e.target.value })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-sm">Fontstørrelse (pt)</label>
                          <input
                            type="number"
                            min="8"
                            className="w-full border p-2 rounded mt-1 text-sm"
                            value={templateStyleForm.fontSizePt}
                            onChange={(e) => setTemplateStyleForm({ ...templateStyleForm, fontSizePt: e.target.value })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-sm">Margin topp (mm)</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full border p-2 rounded mt-1 text-sm"
                            value={templateStyleForm.marginTopMm}
                            onChange={(e) => setTemplateStyleForm({ ...templateStyleForm, marginTopMm: e.target.value })}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-sm">Margin bunn (mm)</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full border p-2 rounded mt-1 text-sm"
                            value={templateStyleForm.marginBottomMm}
                            onChange={(e) => setTemplateStyleForm({ ...templateStyleForm, marginBottomMm: e.target.value })}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-3 flex items-end">
                          <button
                            className="px-3 py-2 bg-slate-800 text-white rounded text-sm w-full"
                            onClick={() => {
                              setTemplateConfig((prev) => {
                                const base = prev && prev.mediahouses ? prev : defaultTemplateConfig();
                                return {
                                  ...base,
                                  mediahouses: {
                                    ...base.mediahouses,
                                    [editingMediahouseKey]: {
                                      ...base.mediahouses[editingMediahouseKey],
                                      style: {
                                        fontFamily: templateStyleForm.fontFamily,
                                        fontSizePt: Number(templateStyleForm.fontSizePt) || 12,
                                        marginTopMm: Number(templateStyleForm.marginTopMm) || 0,
                                        marginBottomMm: Number(templateStyleForm.marginBottomMm) || 0,
                                      },
                                    },
                                  },
                                };
                              });
                              onLogAction?.({
                                module: "Administrasjon",
                                entity: "Maler",
                                entityId: editingMediahouseKey,
                                action: "Oppdatert malstil",
                                details: `${templateStyleForm.fontFamily}, ${templateStyleForm.fontSizePt}pt`,
                              });
                            }}
                          >
                            Lagre endringer
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
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

function sampleRawData(data) {
  const id = data?.id || "0000";
  const leverandor = data?.leverandor || "Leverandor";
  const type = data?.type || "Død";
  const navn = data?.navn || "Navn";
  const publisering = data?.publisering || "2026-01-01T01:00:00";
  const publikasjon = data?.publikasjon || "Publikasjon";
  return `<ad>
  <id>${id}</id>
  <supplier>${leverandor}</supplier>
  <type>${type}</type>
  <name>${navn}</name>
  <publication>${publikasjon}</publication>
  <publication_date>${publisering}</publication_date>
  <content>
    <text>Vår kjære</text>
    <text>${navn}</text>
    <text>${publikasjon}</text>
  </content>
</ad>`;
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
      rawData: sampleRawData({
        id: "19384",
        leverandor: "Memcare",
        type: "Død",
        navn: "Reydun Wegner Lundekvam",
        publisering: "2026-01-29T01:00:00",
        publikasjon: "Marsteinen",
      }),
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
      rawData: sampleRawData({
        id: "19297",
        leverandor: "Memcare",
        type: "Død",
        navn: "Arnulf Georg Gabrielsen",
        publisering: "2026-01-28T01:00:00",
        publikasjon: "Fædrelandsvennen",
      }),
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
      rawData: sampleRawData({
        id: "3048214",
        leverandor: "Adstate",
        type: "Død",
        navn: "Ove Henning Berdahl",
        publisering: "2026-01-26T01:00:00",
        publikasjon: "Adresseavisen",
      }),
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
      rawData: sampleRawData({
        id: "3048316",
        leverandor: "Adstate",
        type: "Takk",
        navn: "Mario V. Urquizo",
        publisering: "2026-01-26T01:00:00",
        publikasjon: "Agderposten",
      }),
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

function mmToPx(mm) {
  return Math.round(Number(mm || 0) * 3.78);
}

function ptToPx(pt) {
  return Math.round(Number(pt || 0) * 1.333);
}

function defaultTemplateConfig() {
  const mediahouses = {
    adresseavisen: {
      name: "Adresseavisen",
      publications: ["Adresseavisen"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
    faedrelandsvennen: {
      name: "Fædrelandsvennen",
      publications: ["Fædrelandsvennen"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
    sunnmorsposten: {
      name: "Sunnmørsposten",
      publications: ["Sunnmørsposten"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
    harstadtidende: {
      name: "Harstad Tidende",
      publications: ["Harstad Tidende"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
    nordlys: {
      name: "Nordlys",
      publications: ["Nordlys"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
    ifinnmark: {
      name: "iFinnmark",
      publications: ["iFinnmark", "Finnmarksposten", "Altaposten", "Finnmark Dagblad"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
    tromsfylke: {
      name: "Troms Folkeblad",
      publications: ["Troms Folkeblad"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
    agderposten: {
      name: "Agderposten",
      publications: ["Agderposten"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
    marsteinen: {
      name: "Marsteinen",
      publications: ["Marsteinen"],
      deathTemplates: ["1sp", "2sp", "1sp dobbelannonser"],
      thanksTemplates: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
      defaultDeath: "1sp",
      defaultThanks: "Takk 1sp",
      style: { fontFamily: "Times New Roman", fontSizePt: 12, marginTopMm: 8, marginBottomMm: 8 },
    },
  };

  return {
    mediahouses,
    defaults: {
      death: ["1sp", "2sp", "1sp dobbelannonser"],
      thanks: ["Takk 1sp", "Takk 1sp m/symbol", "Takk 2sp", "Takk 2sp m/symbol"],
    },
  };
}

function defaultPriceList() {
  return [
    {
      id: "price-1",
      region: "Midt",
      productCode: "AA",
      mediaId: "617",
      publication: "Adresseavisen",
      death: { print: 1540, digital: 300, production: 308 },
      thanks: { print: 1540, digital: 150, production: 308 },
    },
    {
      id: "price-2",
      region: "Nord",
      productCode: "HT",
      mediaId: "599",
      publication: "Harstad Tidende",
      death: { print: 1040, digital: 200, production: 180 },
      thanks: { print: 1040, digital: 120, production: 180 },
    },
    {
      id: "price-3",
      region: "Vest",
      productCode: "SMP",
      mediaId: "475",
      publication: "Sunnmørsposten",
      death: { print: 1320, digital: 240, production: 220 },
      thanks: { print: 1320, digital: 140, production: 220 },
    },
    {
      id: "price-4",
      region: "Sør",
      productCode: "FVN",
      mediaId: "352",
      publication: "Fædrelandsvennen",
      death: { print: 980, digital: 190, production: 170 },
      thanks: { print: 980, digital: 110, production: 170 },
    },
    {
      id: "price-5",
      region: "Nord",
      productCode: "NOP",
      mediaId: "398",
      publication: "Nordlys",
      death: { print: 860, digital: 170, production: 160 },
      thanks: { print: 860, digital: 100, production: 160 },
    },
  ];
}

function defaultCustomerCards() {
  return [
    { id: "card-1", name: "Byes Begravelsesbyrå", region: "Midt", type: "percent", value: 10 },
    { id: "card-2", name: "Fredrikstad Begravelse", region: "Øst", type: "fixed", value: 300 },
    { id: "card-3", name: "Havglimt Begravelsesbyrå", region: "Vest", type: "price", value: 1800 },
  ];
}

function getMediahouseForPublication(publication, templateConfig) {
  if (!publication) return null;
  const config = templateConfig && templateConfig.mediahouses ? templateConfig : defaultTemplateConfig();
  return Object.values(config.mediahouses).find((m) => m.publications.includes(publication)) || null;
}

function getTemplateOptionsForPublication(publication, type, templateConfig) {
  const config = templateConfig && templateConfig.mediahouses ? templateConfig : defaultTemplateConfig();
  const mediahouse = getMediahouseForPublication(publication, config);
  if (!mediahouse) {
    return type === "Takk" ? config.defaults.thanks : config.defaults.death;
  }
  return type === "Takk" ? mediahouse.thanksTemplates : mediahouse.deathTemplates;
}

function getDefaultTemplateForPublication(publication, type, templateConfig) {
  const config = templateConfig && templateConfig.mediahouses ? templateConfig : defaultTemplateConfig();
  const mediahouse = getMediahouseForPublication(publication, config);
  if (!mediahouse) {
    return type === "Takk" ? config.defaults.thanks[0] : config.defaults.death[0];
  }
  return type === "Takk" ? mediahouse.defaultThanks : mediahouse.defaultDeath;
}

function defaultSymbolLibrary() {
  return [
    { id: "sym-1", label: "Kors", value: "✝", type: "text", sizeDeathMm: 18, sizeThanksMm: 16 },
    { id: "sym-2", label: "Hjerte", value: "❤", type: "text", sizeDeathMm: 18, sizeThanksMm: 16 },
    { id: "sym-3", label: "Fugl", value: "🕊", type: "text", sizeDeathMm: 18, sizeThanksMm: 16 },
    { id: "sym-4", label: "Rose", value: "🌹", type: "text", sizeDeathMm: 18, sizeThanksMm: 16 },
    { id: "sym-5", label: "Stjerne", value: "✶", type: "text", sizeDeathMm: 18, sizeThanksMm: 16 },
    { id: "sym-6", label: "Blomst", value: "✿", type: "text", sizeDeathMm: 18, sizeThanksMm: 16 },
    { id: "sym-7", label: "Kors 2", value: "✚", type: "text", sizeDeathMm: 18, sizeThanksMm: 16 },
    { id: "sym-8", label: "Løv", value: "❧", type: "text", sizeDeathMm: 18, sizeThanksMm: 16 },
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
    symbolImage: "",
    symbolSize: 24,
    symbolLockId: "",
    symbolSizeLocked: false,
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
    relativesRows: [{ id: "row-1", layout: "one", left: "", right: "", leftSymbol: "", rightSymbol: "" }],
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

