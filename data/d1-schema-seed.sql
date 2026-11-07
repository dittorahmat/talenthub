CREATE TABLE trial_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    corporate_domain TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    phone_whatsapp TEXT NOT NULL,
    otp_code TEXT,
    otp_hash TEXT,
    otp_attempts INTEGER NOT NULL DEFAULT 0,
    otp_expires_at TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    claimed_at TEXT,
    ip_address TEXT
  );
CREATE TABLE payment_invoices (
    id TEXT PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount_idr INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    provider TEXT DEFAULT 'mock_midtrans',
    paid_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
CREATE TABLE user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    role TEXT DEFAULT 'recruiter',
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE
  );
CREATE TABLE session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
  );
CREATE TABLE account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
CREATE TABLE verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
  );
CREATE TABLE organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );
INSERT INTO organizations VALUES(1,'Tech Satu Solusi','tech-satu-solusi','2026-11-03T08:36:09.457Z');
INSERT INTO organizations VALUES(2,'PT Sirius Global Technologies','sirius-global','2026-11-03T08:36:09.457Z');
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    remote TEXT DEFAULT 'No',
    posted_at TEXT NOT NULL
  );
INSERT INTO jobs VALUES(1,1,'Senior Frontend Engineer','Jakarta, Indonesia','Yes','2026-09-05');
INSERT INTO jobs VALUES(2,1,'Product Designer','Bandung, Indonesia','No','2026-08-29');
INSERT INTO jobs VALUES(3,1,'DevOps Engineer','Surabaya, Indonesia','Hybrid','2026-08-22');
CREATE TABLE applicants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT,
    resume_path TEXT,
    resume_filename TEXT,
    resume_keywords TEXT,
    source TEXT DEFAULT 'JobStreet',
    status TEXT NOT NULL DEFAULT 'Applied',
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    screening_status TEXT DEFAULT 'pending',
    screening_summary TEXT,
    screening_score INTEGER,
    screening_band TEXT,
    screening_verdict TEXT,
    screening_matched TEXT,
    screening_missing TEXT,
    screening_exp_years INTEGER
  );
INSERT INTO applicants VALUES(1,1,'Andi Putra','andi.putra@email.com','+62 812-3456-7890',NULL,NULL,NULL,NULL,'JobStreet','Applied',1,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Screening untuk Andi Putra (8 tahun pengalaman) menunjukkan skor 90 untuk Senior Frontend Engineer. Menguasai React, TypeScript, JavaScript, Node.js, Git namun perlu pendampingan pada CI/CD. Pengalaman sebelumnya di posisi serupa menjadi nilai tambah.',90,'Strong',NULL,'React, TypeScript, JavaScript, Node.js, Git','CI/CD',8);
INSERT INTO applicants VALUES(2,1,'Dewi Lestari','dewi.lestari@email.com','+62 813-4567-8901',NULL,NULL,NULL,NULL,'Kalibrr','Phone Screen',1,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Dewi Lestari memiliki latar belakang 1 tahun yang solid untuk posisi Senior Frontend Engineer. Terbukti mahir di TypeScript, JavaScript, Git, CI/CD melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',45,'Weak',NULL,'TypeScript, JavaScript, Git, CI/CD','React, Node.js',1);
INSERT INTO applicants VALUES(3,1,'Budi Santoso','budi.santoso@email.com','+62 814-5678-9012',NULL,NULL,NULL,NULL,'JobStreet','Technical',1,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Budi Santoso adalah kandidat dengan 6 tahun pengalaman yang relevan untuk Senior Frontend Engineer. Keahlian kunci React, Node.js, Git, CI/CD tercermin dalam portofolio dan pengalaman kerja sebelumnya. Secara umum menunjukkan potensi pertumbuhan yang baik di tim.',70,'Potential',NULL,'React, Node.js, Git, CI/CD','TypeScript, JavaScript',6);
INSERT INTO applicants VALUES(4,1,'Siti Rahayu','siti.rahyu@email.com','+62 815-6789-0123',NULL,NULL,NULL,NULL,'Indeed Indonesia','Final Interview',1,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Siti Rahayu memiliki 2 tahun pengalaman dengan keahlian di JavaScript, CI/CD. Profil sangat relevan untuk Senior Frontend Engineer dengan kecocokan weak dan siap berkontribusi sejak hari pertama. Pengalaman terakhir sebagai pengembang menunjukkan konsistensi dalam delivery fitur berkualitas.',30,'Weak',NULL,'JavaScript, CI/CD','React, TypeScript, Node.js, Git',2);
INSERT INTO applicants VALUES(5,1,'Raka Wijaya','raka.wijaya@email.com','+62 816-7890-1234',NULL,NULL,NULL,NULL,'LinkedIn','Offer',1,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Screening untuk Raka Wijaya (3 tahun pengalaman) menunjukkan skor 55 untuk Senior Frontend Engineer. Menguasai React, TypeScript, Git, CI/CD namun perlu pendampingan pada JavaScript, Node.js. Pengalaman sebelumnya di posisi serupa menjadi nilai tambah.',55,'Potential',NULL,'React, TypeScript, Git, CI/CD','JavaScript, Node.js',3);
INSERT INTO applicants VALUES(6,1,'Andi Kusuma','andi.kusuma@email.com','+62 817-8901-2345',NULL,NULL,NULL,NULL,'Referral','Hired',1,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Dengan 1 tahun di industri, Andi Kusuma menonjol lewat penguasaan TypeScript, JavaScript yang selaras dengan kebutuhan Senior Frontend Engineer. CV menunjukkan proyek relevan dan kolaborasi lintas fungsi yang baik. Cocok untuk tahap screening lanjutan.',25,'Weak',NULL,'TypeScript, JavaScript','React, Node.js, Git, CI/CD',1);
INSERT INTO applicants VALUES(7,1,'Dewi Putri','dewi.putri@email.com','+62 819-0123-4567',NULL,NULL,NULL,NULL,'JobStreet','Applied',2,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Dewi Putri adalah kandidat dengan 4 tahun pengalaman yang relevan untuk Product Designer. Keahlian kunci Figma, UI/UX tercermin dalam portofolio dan pengalaman kerja sebelumnya. Secara umum menunjukkan potensi pertumbuhan yang baik di tim.',60,'Potential',NULL,'Figma, UI/UX','Product Design',4);
INSERT INTO applicants VALUES(8,1,'Andi Pura','andi.pura@email.com','+62 818-9012-3456',NULL,NULL,NULL,NULL,'LinkedIn','Applied',2,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Kandidat Andi Pura dengan 4 tahun pengalaman menawarkan kombinasi Figma, Product Design yang relevan dengan Product Designer. CV ringkas namun padat, menekankan kontribusi pada produk dan kerja tim. Direkomendasikan untuk proses seleksi berikutnya.',60,'Potential',NULL,'Figma, Product Design','UI/UX',4);
INSERT INTO applicants VALUES(9,1,'Raka Pratama','raka.pratama@email.com','+62 820-1234-5678',NULL,NULL,NULL,NULL,'JobStreet','Phone Screen',2,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Raka Pratama memiliki latar belakang 4 tahun yang solid untuk posisi Product Designer. Terbukti mahir di Figma, UI/UX, Product Design melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',80,'Strong',NULL,'Figma, UI/UX, Product Design','',4);
INSERT INTO applicants VALUES(10,1,'Siti Lestari','siti.lestari@email.com','+62 821-2345-6789',NULL,NULL,NULL,NULL,'JobStreet','Technical',2,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Siti Lestari memiliki latar belakang 5 tahun yang solid untuk posisi Product Designer. Terbukti mahir di Figma, Product Design melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',65,'Potential',NULL,'Figma, Product Design','UI/UX',5);
INSERT INTO applicants VALUES(11,1,'Budi Kuncoro','budi.kuncoro@email.com','+62 822-3456-7890',NULL,NULL,NULL,NULL,'Indeed Indonesia','Final Interview',2,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Budi Kuncoro memiliki latar belakang 5 tahun yang solid untuk posisi Product Designer. Terbukti mahir di Figma, UI/UX melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',65,'Potential',NULL,'Figma, UI/UX','Product Design',5);
INSERT INTO applicants VALUES(12,1,'Dewi Anggraini','dewi.anggraini@email.com','+62 823-4567-8901',NULL,NULL,NULL,NULL,'JobStreet','Offer',2,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Dewi Anggraini memiliki latar belakang 5 tahun yang solid untuk posisi Product Designer. Terbukti mahir di Figma, UI/UX melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',65,'Potential',NULL,'Figma, UI/UX','Product Design',5);
INSERT INTO applicants VALUES(13,1,'Fajar Nugraha','fajar.nugraha@email.com','+62 824-5678-9012',NULL,NULL,NULL,NULL,'Kalibrr','Hired',2,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Fajar Nugraha adalah kandidat dengan 7 tahun pengalaman yang relevan untuk Product Designer. Keahlian kunci Figma, Product Design tercermin dalam portofolio dan pengalaman kerja sebelumnya. Secara umum menunjukkan potensi pertumbuhan yang baik di tim.',75,'Strong',NULL,'Figma, Product Design','UI/UX',7);
INSERT INTO applicants VALUES(14,1,'Andi Pratama','andi.pratama@email.com','+62 812-3456-7890',NULL,NULL,NULL,NULL,'JobStreet','Applied',3,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Andi Pratama memiliki latar belakang 8 tahun yang solid untuk posisi DevOps Engineer. Terbukti mahir di Docker, Kubernetes melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',64,'Potential',NULL,'Docker, Kubernetes','AWS, Linux, CI/CD',8);
INSERT INTO applicants VALUES(15,1,'Dewi Wulandari','dewi.wulandari@email.com','+62 813-4567-8901',NULL,NULL,NULL,NULL,'Kalibrr','Phone Screen',3,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Dewi Wulandari memiliki latar belakang 6 tahun yang solid untuk posisi DevOps Engineer. Terbukti mahir di Kubernetes melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',42,'Weak',NULL,'Kubernetes','Docker, AWS, Linux, CI/CD',6);
INSERT INTO applicants VALUES(16,1,'Budi Ardi','budi.ardi@email.com','+62 814-5678-9012',NULL,NULL,NULL,NULL,'JobStreet','Technical',3,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Budi Ardi memiliki 7 tahun pengalaman dengan keahlian di Kubernetes, AWS, Linux. Profil sangat relevan untuk DevOps Engineer dengan kecocokan potential dan siap berkontribusi sejak hari pertama. Pengalaman terakhir sebagai pengembang menunjukkan konsistensi dalam delivery fitur berkualitas.',71,'Potential',NULL,'Kubernetes, AWS, Linux','Docker, CI/CD',7);
INSERT INTO applicants VALUES(17,1,'Dewi Yanti','dewi.yanti@email.com','+62 815-6789-0123',NULL,NULL,NULL,NULL,'JobStreet','Final Interview',3,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Dewi Yanti memiliki latar belakang 8 tahun yang solid untuk posisi DevOps Engineer. Terbukti mahir di beberapa area inti melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',40,'Weak',NULL,'','Docker, Kubernetes, AWS, Linux, CI/CD',8);
INSERT INTO applicants VALUES(18,1,'Raka Dwi','raka.dwi@email.com','+62 816-7890-1234',NULL,NULL,NULL,NULL,'JobStreet','Offer',3,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Raka Dwi memiliki 5 tahun pengalaman dengan keahlian di CI/CD. Profil sangat relevan untuk DevOps Engineer dengan kecocokan weak dan siap berkontribusi sejak hari pertama. Pengalaman terakhir sebagai pengembang menunjukkan konsistensi dalam delivery fitur berkualitas.',37,'Weak',NULL,'CI/CD','Docker, Kubernetes, AWS, Linux',5);
INSERT INTO applicants VALUES(19,1,'Andi Setia','andi.setia@email.com','+62 817-8901-2345',NULL,NULL,NULL,NULL,'JobStreet','Hired',3,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Andi Setia memiliki latar belakang 3 tahun yang solid untuk posisi DevOps Engineer. Terbukti mahir di Kubernetes, AWS, CI/CD melalui proyek-proyek terdahulu. Kandidat ini layak dipertimbangkan untuk wawancara teknis.',51,'Potential',NULL,'Kubernetes, AWS, CI/CD','Docker, Linux',3);
INSERT INTO applicants VALUES(20,1,'Budi Setiawan','budi.setiawan@email.com','+62 819-0123-4567',NULL,NULL,NULL,NULL,'JobStreet','Applied',3,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Budi Setiawan memiliki 1 tahun pengalaman dengan keahlian di CI/CD. Profil sangat relevan untuk DevOps Engineer dengan kecocokan weak dan siap berkontribusi sejak hari pertama. Pengalaman terakhir sebagai pengembang menunjukkan konsistensi dalam delivery fitur berkualitas.',17,'Weak',NULL,'CI/CD','Docker, Kubernetes, AWS, Linux',1);
INSERT INTO applicants VALUES(21,1,'Siti Handayani','siti.handayani@email.com','+62 825-6789-0123',NULL,NULL,NULL,NULL,'LinkedIn','Phone Screen',3,'2026-11-03T08:36:09.457Z','2026-11-03T08:36:09.457Z','ready','Siti Handayani adalah kandidat dengan 3 tahun pengalaman yang relevan untuk DevOps Engineer. Keahlian kunci Docker, Kubernetes tercermin dalam portofolio dan pengalaman kerja sebelumnya. Secara umum menunjukkan potensi pertumbuhan yang baik di tim.',39,'Weak',NULL,'Docker, Kubernetes','AWS, Linux, CI/CD',3);
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT DEFAULT 'HR Admin',
    created_at TEXT NOT NULL
  );
INSERT INTO notes VALUES(1,1,1,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(2,1,1,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(3,1,2,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(4,1,2,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(5,1,3,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(6,1,3,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(7,1,4,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(8,1,4,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(9,1,5,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(10,1,5,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(11,1,6,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(12,1,6,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(13,1,7,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(14,1,7,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(15,1,8,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(16,1,8,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(17,1,9,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(18,1,9,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(19,1,10,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(20,1,10,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(21,1,11,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(22,1,11,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(23,1,12,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(24,1,12,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(25,1,13,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(26,1,13,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(27,1,14,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(28,1,14,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(29,1,15,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(30,1,15,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(31,1,16,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(32,1,16,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(33,1,17,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(34,1,17,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(35,1,18,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(36,1,18,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(37,1,19,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(38,1,19,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(39,1,20,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(40,1,20,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(41,1,21,'Review awal CV: Kualifikasi sangat sesuai dengan deskripsi pekerjaan.','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO notes VALUES(42,1,21,'Kandidat responsif saat dihubungi dan bersedia interview.','HR Admin','2026-11-03T08:36:09.457Z');
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id) ON DELETE CASCADE,
    applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    user TEXT DEFAULT 'HR Admin',
    timestamp TEXT NOT NULL
  );
INSERT INTO activities VALUES(1,1,1,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(2,1,1,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(3,1,2,'status_change','Kandidat melamar posisi melalui Kalibrr','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(4,1,2,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(5,1,3,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(6,1,3,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(7,1,4,'status_change','Kandidat melamar posisi melalui Indeed Indonesia','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(8,1,4,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(9,1,5,'status_change','Kandidat melamar posisi melalui LinkedIn','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(10,1,5,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(11,1,6,'status_change','Kandidat melamar posisi melalui Referral','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(12,1,6,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(13,1,7,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(14,1,7,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(15,1,8,'status_change','Kandidat melamar posisi melalui LinkedIn','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(16,1,8,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(17,1,9,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(18,1,9,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(19,1,10,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(20,1,10,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(21,1,11,'status_change','Kandidat melamar posisi melalui Indeed Indonesia','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(22,1,11,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(23,1,12,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(24,1,12,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(25,1,13,'status_change','Kandidat melamar posisi melalui Kalibrr','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(26,1,13,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(27,1,14,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(28,1,14,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(29,1,15,'status_change','Kandidat melamar posisi melalui Kalibrr','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(30,1,15,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(31,1,16,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(32,1,16,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(33,1,17,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(34,1,17,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(35,1,18,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(36,1,18,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(37,1,19,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(38,1,19,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(39,1,20,'status_change','Kandidat melamar posisi melalui JobStreet','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(40,1,20,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(41,1,21,'status_change','Kandidat melamar posisi melalui LinkedIn','Sistem','2026-11-03T08:36:09.457Z');
INSERT INTO activities VALUES(42,1,21,'note','HR Admin menambahkan catatan review awal','HR Admin','2026-11-03T08:36:09.457Z');
CREATE TABLE job_knockouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    question TEXT NOT NULL
  );
INSERT INTO job_knockouts VALUES(1,1,'Apakah Anda bersedia bekerja onsite sesuai lokasi lowongan?');
INSERT INTO job_knockouts VALUES(2,1,'Apakah Anda memiliki minimal 2 tahun pengalaman relevan?');
INSERT INTO job_knockouts VALUES(3,2,'Apakah Anda bersedia bekerja onsite sesuai lokasi lowongan?');
INSERT INTO job_knockouts VALUES(4,2,'Apakah Anda memiliki minimal 2 tahun pengalaman relevan?');
INSERT INTO job_knockouts VALUES(5,3,'Apakah Anda bersedia bekerja onsite sesuai lokasi lowongan?');
INSERT INTO job_knockouts VALUES(6,3,'Apakah Anda memiliki minimal 2 tahun pengalaman relevan?');
CREATE TABLE inbox_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    name TEXT,
    email TEXT,
    phone TEXT,
    keywords TEXT,
    score INTEGER,
    band TEXT,
    verdict TEXT,
    rationale TEXT,
    knockout_result TEXT,
    duplicate_of INTEGER,
    promoted_applicant_id INTEGER,
    created_at TEXT NOT NULL
  );
CREATE TABLE credit_wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
INSERT INTO credit_wallets VALUES(1,1,50,'2026-11-03T08:36:09.457Z');
INSERT INTO credit_wallets VALUES(2,2,20,'2026-11-03T08:36:09.457Z');
CREATE TABLE credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL REFERENCES credit_wallets(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    balance_after INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
INSERT INTO credit_transactions VALUES(1,1,1,50,'INITIAL_GRANT','Initial free tier credits for Tech Satu Solusi',50,'2026-11-03T08:36:09.457Z');
INSERT INTO credit_transactions VALUES(2,2,2,20,'INITIAL_GRANT','Initial grant for PT Sirius Global Technologies',20,'2026-11-03T08:36:09.457Z');
INSERT INTO sqlite_sequence VALUES('organizations',2);
INSERT INTO sqlite_sequence VALUES('credit_wallets',2);
INSERT INTO sqlite_sequence VALUES('credit_transactions',2);
INSERT INTO sqlite_sequence VALUES('jobs',3);
INSERT INTO sqlite_sequence VALUES('applicants',21);
INSERT INTO sqlite_sequence VALUES('notes',42);
INSERT INTO sqlite_sequence VALUES('activities',42);
INSERT INTO sqlite_sequence VALUES('job_knockouts',6);
