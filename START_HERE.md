Lỗi trên Windows “open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified” = Docker Desktop (Linux engine) chưa chạy/không sẵn sàng. Cách khắc phục nhanh:
1) Mở và bật Docker Desktop
Khởi chạy Docker Desktop, đợi đến khi “Docker Desktop is running”.
Từ icon cá voi ở khay hệ thống:
Nếu thấy “Switch to Linux containers…”, bấm để chuyển sang Linux (nếu đang Windows containers).
Nếu thấy “Switch to Windows containers…”, tức là đang ở Linux containers rồi.
2) Bật WSL2 và tích hợp với Docker
Bật tính năng Windows:
Turn Windows features on or off -> tích “Windows Subsystem for Linux” và “Virtual Machine Platform”, rồi reboot.
Cài distro Linux (ví dụ Ubuntu) nếu chưa có:
wsl --install -d Ubuntu
Bật WSL integration trong Docker Desktop:
Settings -> Resources -> WSL integration -> bật cho distro bạn dùng.
Kiểm tra nhanh:
wsl --status
wsl -l -v (thấy Docker Desktop WSL distro và Ubuntu ở trạng thái Running)
Nếu cần: wsl --shutdown rồi mở lại Docker Desktop.
3) Kiểm tra Docker CLI
docker version
docker context ls
Nếu cần: docker context use default
Kiểm tra compose: docker compose version
4) Chạy lại từ thư mục chứa docker-compose.yml
Mở PowerShell/CMD và cd đến thư mục dự án có file docker-compose.yml (không phải Documents/Aw trừ khi file nằm ở đó).
Chạy: docker compose up -d --build
Nếu muốn test trước khả năng kéo image: docker pull eclipse-mosquitto:2
Ghi chú thêm:
Chúng ta đã chuyển Mosquitto data sang named volume, nên không còn vướng quyền trên host. Mount config vẫn dùng: ./infra/mosquitto/config:/mosquitto/config:ro — đảm bảo thư mục đó có mosquitto.conf đọc được.
Postgres đã dùng named volume pgdata sẵn.
Bạn thử làm theo 4 bước trên, nếu vẫn lỗi, cho mình:
Kết quả docker version, docker context ls
Kết quả wsl -l -v
Thư mục bạn đang chạy (pwd) và có file docker-compose.yml hay không.