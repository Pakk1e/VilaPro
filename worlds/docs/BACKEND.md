# Worlds Backend

## Runtime

The production Worlds API runs as a native `systemd` service:

- Service: `worlds-api.service`
- Working directory: `/home/park-pro/VilaPro/worlds`
- Python: `/usr/bin/python3`
- Module: `worlds.api.server`
- `PYTHONPATH`: `/home/park-pro/VilaPro/worlds/src`
- Health endpoint: `http://127.0.0.1:8001/health`
- Simulation endpoint: `POST http://127.0.0.1:8001/simulate`

The service executes directly from the Git working tree. There is no separately installed Worlds package used by the service.

## Why systemd

Worlds is a Python service running on Linux, so `systemd` is the native service supervisor. It provides boot-time startup, failure restart, service isolation, dependency ordering, and journald logging. PM2 is not used for the Worlds API.

The unit is configured with `Restart=on-failure` and a five-second restart delay.

## Tests

Run the full backend test suite from the `worlds` directory:

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Do not use `python -m unittest discover -s tests` without `PYTHONPATH=src`; the package is intentionally sourced from `worlds/src`.

## Deployment

The production service uses the same source tree that is updated by Git. The normal deployment sequence is:

```bash
cd ~/VilaPro
git pull

cd worlds
PYTHONPATH=src python3 -m unittest discover -s tests -v

sudo systemctl restart worlds-api.service
sudo systemctl status worlds-api.service --no-pager
curl -s http://127.0.0.1:8001/health
```

Only restart the service after the test suite passes.

## Logs

Follow live service logs with:

```bash
sudo journalctl -u worlds-api.service -f
```

Recent logs:

```bash
sudo journalctl -u worlds-api.service --no-pager -n 100
```

## Troubleshooting

### API is healthy but the UI receives HTTP 400

Inspect the JSON response from `/simulate` and the service logs. A 400 is normally an application validation or semantic error, not a service availability problem.

### Unit mismatch with apparently identical dimensions

World semantic quantities and physical units must be compared by their SI exponent vector. Do not bypass unit validation or change the frontend unit string to hide the problem. Regression coverage for derived electrical units is in `tests/test_semantic_units.py`.

### Service is running old code

Check the Git revision and restart the service. Because the service runs directly from `/home/park-pro/VilaPro/worlds` with that directory on `PYTHONPATH`, a successful restart loads the current working-tree source.

Useful commands:

```bash
git log --oneline -5
sudo systemctl status worlds-api.service --no-pager
sudo systemctl cat worlds-api.service
```
