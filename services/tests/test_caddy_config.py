from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
CADDY_COMPOSE_PATH = ROOT_DIR / "services" / "caddy-service" / "docker-compose.yml"


def _resolve_caddyfile_path() -> Path:
    candidates = [
        ROOT_DIR / "Caddyfile",
        ROOT_DIR / "services" / "caddy-service" / "Caddyfile",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Caddyfile not found in known locations")


def test_caddyfile_contains_expected_routes() -> None:
    caddyfile = _resolve_caddyfile_path().read_text(encoding="utf-8")

    assert "handle /api/*" in caddyfile
    assert "reverse_proxy backend:8000" in caddyfile

    assert "handle /oauth/*" in caddyfile
    assert "reverse_proxy oauth-proxy:4180" in caddyfile

    assert "handle /mail/*" in caddyfile
    assert "reverse_proxy contact-service:3002" in caddyfile

    assert "@stripe_checkout path /create-checkout-session" in caddyfile
    assert "@stripe_webhook path /webhook" in caddyfile
    assert "@stripe_success path /success /supporter/thanks" in caddyfile
    assert "reverse_proxy stripe-service:3001" in caddyfile

    assert "handle {" in caddyfile
    assert "reverse_proxy frontend:80" in caddyfile


def test_caddy_compose_has_expected_dependencies_and_mount() -> None:
    compose = CADDY_COMPOSE_PATH.read_text(encoding="utf-8")

    assert "services:" in compose
    assert "caddy:" in compose
    assert (
        "./services/caddy-service/Caddyfile:/etc/caddy/Caddyfile:ro" in compose
        or "./Caddyfile:/etc/caddy/Caddyfile:ro" in compose
        or "../../Caddyfile:/etc/caddy/Caddyfile:ro" in compose
    )

    assert "depends_on:" in compose
    assert "- frontend" in compose
    assert "- backend" in compose
    assert "- oauth-proxy" in compose
