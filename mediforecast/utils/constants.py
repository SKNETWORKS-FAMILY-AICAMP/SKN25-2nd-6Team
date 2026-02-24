# color set
COLOR_BLUE       = "#85AAD0"
COLOR_BLUE_DARK  = "#6990B8"
COLOR_PINK       = "#F57E76"
COLOR_PINK_DARK  = "#D9605A"
COLOR_RISK_HIGH  = "#F57E76"
COLOR_RISK_MED   = "#FFC782"
COLOR_RISK_LOW   = "#8AC19A"
COLOR_SELECTED   = "#85AAD0"

# Neighbourhoods in Vitória, Espírito Santo, Brazil
NEIGHBOURHOODS_STATIC = [
    "AEROPORTO", "ALEXANDRIA", "ANDORINHAS", "ANTÔNIO HONÓRIO", "ARIOVALDO FAVALESSA",
    "BELA VISTA", "BENTO FERREIRA", "BOA VISTA", "BONFIM", "CARATOÍRA",
    "CENTRO", "COMDUSA", "CONSOLAÇÃO", "CRUZAMENTO", "DA PENHA",
    "DE LOURDES", "DEMO", "DOBRADA", "DOM BOSCO", "ENSEADA DO SUÁ",
    "ESTRELINHA", "FONTE GRANDE", "FORTE SÃO JOÃO", "FRADINHOS", "GOIABEIRAS",
    "GURIGICA", "HORTO", "ILHA DAS CAIEIRAS", "ILHA DE SANTA MARIA", "ILHA DO BOI",
    "ILHA DO FRADE", "ILHA DO PRÍNCIPE", "ILHAS OCEÂNICAS DE TRINDADE", "INHANGUETÁ",
    "ITARARÉ", "JABOUR",
    "JARDIM CAMBURI", "JARDIM DA PENHA", "JESUS DE NAZARETH", "JOANA D´ARC", "JUCUTUQUARA",
    "MARIA ORTIZ", "MARUÍPE", "MATA DA PRAIA", "MONTE BELO", "MORADA DE CAMBURI",
    "MUMBUCA", "NAZARETH", "NOVA PALESTINA", "PARQUE INDUSTRIAL", "PARQUE MOSCOSO",
    "PIEDADE", "PONTAL DE CAMBURI", "PRAIA DO CANTO", "PRAIA DO SUÁ", "REDENÇÃO",
    "REPÚBLICA", "RESISTÊNCIA", "ROMÃO", "SANTA CECÍLIA", "SANTA CLARA",
    "SANTA LUÍZA", "SANTA LÚCIA", "SANTA MARTHA", "SANTA TEREZA", "SANTO ANDRÉ",
    "SANTO ANTÔNIO", "SANTOS DUMONT", "SANTOS REIS",
    "SÃO BENEDITO", "SÃO CRISTÓVÃO", "SÃO JOSÉ", "SÃO PEDRO",
    "SEGURANÇA DO LAR", "SOLON BORGES", "TABUAZEIRO", "UNIVERSITY OF ESPÍRITO SANTO", "VILA RUBIM",
]

def _load_nhood_map_from_csv() -> dict:
    import csv
    from pathlib import Path

    csv_path = Path(__file__).resolve().parents[2] / "data" / "Train_table_full.csv"
    if not csv_path.exists():
        return {}

    mapping: dict[int, str] = {}
    try:
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                nid = row.get("nhood_id") or row.get("nhood id")
                name = row.get("nhood_name") or row.get("nhood name")
                if not nid or not name:
                    continue
                try:
                    nid_i = int(float(nid))
                except Exception:
                    continue
                # prefer first encountered name for a given id
                if nid_i not in mapping:
                    mapping[nid_i] = name.strip()
    except Exception:
        return {}
    return mapping

_CSV_MAP = _load_nhood_map_from_csv()
if _CSV_MAP:
    NEIGHBOURHOOD_MAP: dict[int, str] = _CSV_MAP
    NEIGHBOURHOODS = sorted({v for v in NEIGHBOURHOOD_MAP.values()})
else:
    NEIGHBOURHOOD_MAP: dict[int, str] = {i: name for i, name in enumerate(sorted(NEIGHBOURHOODS_STATIC))}
    NEIGHBOURHOODS = sorted(NEIGHBOURHOODS_STATIC)

NEIGHBOURHOOD_CODE: dict[str, int] = {v: k for k, v in NEIGHBOURHOOD_MAP.items()}


def neighbourhood_label(value) -> str:
    """Return display name for a neighbourhood code (int) or pass-through string."""
    if isinstance(value, int):
        return NEIGHBOURHOOD_MAP.get(value, "N/A")
    return str(value) if value else "N/A"