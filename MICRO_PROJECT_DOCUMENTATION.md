# CampusCare Micro-Project Documentation
## Campus Helpdesk and Complaint Management System using Docker, Kubernetes, GitHub and Free Cloud Hosting

> **Important:** Run the commands in Windows PowerShell from the project root. This starter kit is a baseline to inspect and test, not proof that the application has already run on your laptop. Change demo passwords before public deployment. Never upload secrets to GitHub.

## 1. Aim
Develop a responsive Campus Helpdesk and Complaint Management web application, containerise it with Docker, deploy and manage it with Kubernetes, push the source code to GitHub, and host the application publicly using a Docker-compatible free cloud service.

## 2. Features and access control
- Students submit a complaint with name, optional email, category, priority, title and description.
- The backend returns a real reference such as `CH-0001`.
- Students track one complaint by reference and see status/timeline; they cannot update status or list all complaints.
- Staff sign in on `/staff.html`, view complaints, search/filter, and update status.
- Backend verifies a signed, expiring staff token on every staff-only read/update.
- PostgreSQL stores complaints and status history.
- Docker Compose runs the app and database locally; Kubernetes runs two app replicas and one PostgreSQL pod with a persistent volume claim.
- Render provides the public URL. Minikube is the local Kubernetes demonstration; Render is not Kubernetes.

## 3. Technology stack
| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Data | PostgreSQL |
| Security | Helmet, rate limiting, bcrypt password hashes, signed expiring staff token |
| Containerisation | Docker, Docker Compose |
| Orchestration | Kubernetes via Minikube and kubectl |
| Source control | Git and GitHub |
| Public hosting | Render Docker Web Service + hosted PostgreSQL such as Neon |

## 4. Prerequisite and laptop check
Open Docker Desktop and wait until it says the engine is running. Open PowerShell and run:
```powershell
systeminfo | findstr /C:"Total Physical Memory"
(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors
docker --version
docker info --format '{{.OSType}}'
kubectl version --client
minikube version
git --version
node --version
npm --version
```
Expected: Docker responds without error and `docker info` prints `linux`. If a tool is not recognised, install it and reopen PowerShell.

Official installation links:
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- kubectl (Windows): https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
- Minikube: https://minikube.sigs.k8s.io/docs/start/
- Git: https://git-scm.com/download/win
- Node.js LTS: https://nodejs.org/en/download

Suggested Minikube baseline: 2 CPU cores and 3–4 GB memory available to the cluster, with several GB of free disk. Close memory-heavy applications if the cluster will not start.

**Screenshot 1 — `01-tools-ready.png`:** one PowerShell window showing successful Docker, kubectl, Minikube and Git versions. Do not capture passwords or tokens.

## 5. Project structure
```text
CampusCare_Redo_Kit/
├── server.js
├── package.json
├── Dockerfile
├── docker-compose.yml
├── render.yaml
├── .gitignore
├── .dockerignore
├── ANTIGRAVITY_MASTER_PROMPT.txt
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── staff.html
│   ├── staff.js
│   └── images/amal-jyothi-college-logo.png
├── scripts/check-prerequisites.ps1
└── k8s/
    ├── 01-namespace.yaml
    ├── 02-config-secret.yaml
    ├── 03-postgres.yaml
    └── 04-app.yaml
```
Extract the ZIP, then `cd` into the folder containing `docker-compose.yml`:
```powershell
cd "$HOME\Downloads\CampusCare_Redo_Kit"
dir
```
If you extracted it elsewhere, use that actual folder path.

**Screenshot 2 — `02-project-files.png`:** PowerShell `dir` showing `server.js`, `Dockerfile`, `docker-compose.yml`, `public` and `k8s`.

## 6. Inspect and improve the website in Antigravity
1. Open the extracted project folder in Google Antigravity.
2. Open `ANTIGRAVITY_MASTER_PROMPT.txt`, copy all of it, and paste it into the Agent.
3. Let the agent inspect the actual files before changing them.
4. Review the changed-file summary. Keep the stack and deployment files intact unless a necessary fix is explained.
5. Do not claim features or tests work until you have tested them.

The supplied college logo is `public/images/amal-jyothi-college-logo.png`. Preserve its proportions and do not recolour it. CampusCare is a student demo and should not imply official integration.

## 7. Start locally with Docker Compose
From the project root:
```powershell
docker compose config
docker compose up -d --build
docker compose ps
docker images
```
Wait for the database health check and app to start. Open:
- Student page: http://localhost:3000
- Staff page: http://localhost:3000/staff.html
- Health check: http://localhost:3000/health

Default local demo credentials are `staff` / `staff123`. Use them only locally. Before public deployment, set a unique username and strong password.

If the build fails, inspect the first meaningful error:
```powershell
docker compose logs --tail=80 web
docker compose logs --tail=80 db
```
Do **not** use `docker compose down -v` casually; `-v` deletes the local database volume and its stored complaints. Normal stop:
```powershell
docker compose down
```
Restart later with `docker compose up -d`.

**Screenshot 3 — `03-docker-running.png`:** `docker compose ps` showing the web service and PostgreSQL service healthy/running, plus `docker images` showing `campuscare:v1`.

## 8. Functional and security test
1. Open the student page and submit a real test complaint (example title: `Projector not working in Lab 2`).
2. Write down the actual reference returned by the application. Do not assume it is CH-0001 if the database already contains records.
3. Track that reference. It should show Open and a timeline.
4. Open `/staff.html`, sign in, find the complaint and change its status to In Progress.
5. Return to the student page and track the same reference again. The new status should appear.
6. Test an invalid reference to see a clear error.
7. Test that staff routes reject unauthenticated requests:
```powershell
curl.exe -i http://localhost:3000/api/staff/complaints
curl.exe -i -X PATCH http://localhost:3000/api/staff/complaints/CH-0001 -H "Content-Type: application/json" -d "{\"status\":\"Resolved\"}"
```
Expected for the two unauthenticated staff requests: `401 Unauthorized`. The reference in the test command is only an example.
8. Check JavaScript syntax:
```powershell
node --check server.js
node --check public/app.js
node --check public/staff.js
```

**Screenshot 4 — `04-student-reference.png`:** student page showing the real reference after successful submission.
**Screenshot 5 — `05-staff-dashboard.png`:** staff dashboard showing the complaint and status control. Do not expose passwords or tokens.
**Screenshot 6 — `06-updated-tracking.png`:** student tracking page showing In Progress or another updated status.
**Screenshot 7 — `07-unauthorised-401.png`:** PowerShell showing the 401 response for unauthenticated staff endpoints.

## 9. Kubernetes deployment with Minikube
Start Docker Desktop first. Then:
```powershell
minikube start --driver=docker --cpus=2 --memory=3072
kubectl config current-context
kubectl get nodes
```
Wait until the node status is `Ready`.

**Screenshot 8 — `08-kubernetes-node-ready.png`:** `kubectl get nodes` showing `Ready`.

### Load the image and apply manifests
Build the app image locally first, then load it into Minikube:
```powershell
docker compose build web
minikube image load campuscare:v1
kubectl apply -f k8s/01-namespace.yaml
kubectl apply -f k8s/02-config-secret.yaml
```
**Before applying the Kubernetes Secret:** edit `k8s/02-config-secret.yaml` and replace the example DB password, staff password and token secret. Use the same DB password in the secret that PostgreSQL receives; the app gets those values through `envFrom`.
```powershell
kubectl apply -f k8s/03-postgres.yaml
kubectl rollout status deployment/postgres -n campuscare --timeout=180s
kubectl apply -f k8s/04-app.yaml
kubectl rollout status deployment/campuscare-app -n campuscare --timeout=180s
kubectl get all -n campuscare
kubectl get pvc -n campuscare
```
Wait for two app pods and one PostgreSQL pod to be Running/Ready and the PVC to be Bound. If an app pod cannot connect, check that the secret values match and inspect logs.

```powershell
kubectl logs -l app=campuscare -n campuscare --tail=50
kubectl describe pods -n campuscare
```
**Screenshot 9 — `09-kubernetes-resources.png`:** `kubectl get all -n campuscare` and `kubectl get pvc -n campuscare`, showing two app replicas, PostgreSQL and Bound storage.

### Open the Kubernetes version
In a PowerShell window, run and leave it open:
```powershell
kubectl port-forward svc/campuscare-service 8081:80 -n campuscare
```
Open http://localhost:8081 in a browser and submit a test complaint.

**Screenshot 10 — `10-kubernetes-app.png`:** browser showing `localhost:8081` and the application running from Kubernetes.

## 10. Demonstrate Kubernetes management
Use a second PowerShell window from any folder.

### Logs
```powershell
kubectl logs -l app=campuscare -n campuscare --tail=30
```
### Scaling
```powershell
kubectl scale deployment campuscare-app --replicas=4 -n campuscare
kubectl get pods -n campuscare
```
Capture the four app pods, then scale back:
```powershell
kubectl scale deployment campuscare-app --replicas=2 -n campuscare
kubectl rollout status deployment/campuscare-app -n campuscare
```
**Screenshot 11 — `11-scaled-four-replicas.png`:** pod list with four app replicas running.

### Self-healing
```powershell
$pod = kubectl get pods -n campuscare -l app=campuscare -o jsonpath="{.items[0].metadata.name}"
kubectl delete pod $pod -n campuscare
kubectl get pods -n campuscare
```
A Deployment should create a replacement pod. Wait until all app pods are ready.
**Screenshot 12 — `12-self-healing.png`:** pod list showing the replacement app pod.

### Database persistence
Submit a complaint through the Kubernetes app, then restart only the PostgreSQL pod:
```powershell
kubectl delete pod -l app=postgres -n campuscare
kubectl get pods -n campuscare -w
```
When PostgreSQL is ready, press Ctrl+C and query the stored records:
```powershell
kubectl exec deployment/postgres -n campuscare -- psql -U campus -d campuscare -c "SELECT id,title,status FROM complaints;"
```
The row should remain because PostgreSQL uses the PVC. Note that this verifies local Minikube persistence, not cloud database backup.
**Screenshot 13 — `13-database-persistence.png`:** SQL output showing the test complaint after PostgreSQL pod restart.

If port-forward stops after pod changes, stop it with Ctrl+C and start it again.

## 11. GitHub commit and push
Create a new empty repository on https://github.com named `campuscare` (do not add a README if you already have local files). From the project root:
```powershell
git init
git add .
git status
git commit -m "Build CampusCare helpdesk micro-project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/campuscare.git
git push -u origin main
```
Replace `YOUR_USERNAME`. If a remote already exists, check it with `git remote -v` rather than adding a duplicate. Make sure `.env`, passwords and database URLs are not committed. The provided `.gitignore` excludes `.env`.

After a code change:
```powershell
git add .
git commit -m "Improve CampusCare interface"
git push
```
**Screenshot 14 — `14-github-repository.png`:** GitHub repository showing the project files and latest commit. Ensure no secrets are visible.

## 12. Public hosting on Render + hosted PostgreSQL
Render free web services can sleep after 15 minutes of inactivity and take about a minute to wake. Its free Postgres offering has a 30-day expiry, so for a longer-lived free project database consider a free external PostgreSQL provider such as Neon, and check the provider's current terms. See official Render limitations: https://render.com/docs/free and Render web services: https://render.com/docs/web-services.

### Create hosted PostgreSQL
1. Sign up at https://neon.tech and create a PostgreSQL project/database.
2. Open the connection details and copy the connection string. Treat it as a password.
3. Do not paste the connection string into source code or GitHub.
4. Confirm the provider's current connection and SSL requirements. The app supports `DATABASE_URL` and defaults to SSL for hosted URLs unless `DB_SSL=false`.

### Deploy on Render
1. Sign up at https://render.com and connect your GitHub account.
2. Choose **New → Web Service**, select the `campuscare` repository.
3. Choose Docker runtime and Free plan if offered for your account/region.
4. Set health check path to `/health`.
5. Add environment variables in Render's dashboard:
   - `DATABASE_URL`: hosted PostgreSQL connection string
   - `DB_SSL`: `true`
   - `TOKEN_SECRET`: a long, unique random secret
   - `STAFF_USER`: your chosen staff username
   - `STAFF_PASS`: a strong unique password
6. Deploy and open the Logs page. Wait for the service to become Live and for `Database ready` to appear.
7. Open the public `https://YOUR-SERVICE.onrender.com` URL, submit a test complaint, sign in at `/staff.html`, update its status, and track it again from a different device/network if possible.
8. Never use the default local staff credentials in public hosting.

**Screenshot 15 — `15-render-live.png`:** Render service status showing Live and the service name. Hide environment variable values.
**Screenshot 16 — `16-public-campuscare.png`:** public site URL in the address bar and a real submitted reference. Do not expose student email or secrets.

Render's official deploy guide: https://render.com/docs/your-first-deploy. Public hosting does not replace the local Kubernetes section of this assignment.

## 13. Responsive checks
Test at desktop 1440px, laptop 1280px, tablet 768px and phone 390px. In browser DevTools device toolbar, verify no horizontal overflow, clipped buttons or unreadable labels. Test keyboard focus and reduced-motion preference. Test on a real phone using the public URL once deployed.

## 14. Troubleshooting
| Problem | Action |
|---|---|
| `docker` not recognised | Start Docker Desktop, reopen PowerShell; if needed locate Docker Desktop's `docker.exe` and temporarily add its directory to PATH. |
| `kubectl` not recognised | Install using official Kubernetes instructions, then reopen PowerShell. |
| Minikube API error/EOF | Check `minikube status`, Docker engine, and `kubectl config current-context`; try `minikube stop` then `minikube start --driver=docker --cpus=2 --memory=3072`. Avoid deleting the cluster/data as a first step. |
| `ErrImageNeverPull` | Run `docker compose build web` then `minikube image load campuscare:v1`. |
| Pods stuck starting | `kubectl describe pod POD_NAME -n campuscare` and `kubectl logs POD_NAME -n campuscare`. |
| DB connection error | Confirm Secret password equals Postgres password, and `DB_HOST=postgres-service` in ConfigMap. |
| Port 3000 already used | Change the host side of Compose mapping, e.g. `3001:3000`, then browse to localhost:3001. |
| Render first visit is slow | Free services sleep while idle; wait for the service to wake. |
| Render database errors | Check `DATABASE_URL`, SSL settings and provider connection rules in dashboard logs. |
| Staff login fails | Check the `STAFF_USER` and `STAFF_PASS` used for that environment. Existing staff row is not automatically reset when environment values change. |

## 15. Conclusion
CampusCare demonstrates a real-world student support workflow with complaint references, read-only student tracking, authenticated staff management, PostgreSQL data storage, Docker containerisation, Kubernetes deployment and management, GitHub version control, and public cloud hosting. Complete each test and capture evidence only after the relevant milestone works; do not include fabricated screenshots or results.

## Screenshot checklist (only important evidence)
1. Tool versions and Docker engine
2. Project files
3. Docker image and running containers
4. Student complaint reference
5. Staff dashboard
6. Updated student tracking status
7. Unauthenticated staff endpoints returning 401
8. Kubernetes node Ready
9. Kubernetes deployments/services/pods and PVC Bound
10. App opened via Kubernetes port-forward
11. Four replicas after scaling
12. Replacement pod after self-healing
13. Database row remains after PostgreSQL pod restart
14. GitHub repository and commit
15. Render service Live
16. Public website URL and working reference
