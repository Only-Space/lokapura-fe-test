// src/main.js
import './style.css'; // Impor file CSS murni yang kita buat

// ===================================================================
// GANTI URL INI DENGAN URL PUBLIK ANDA JIKA MENGUJI DARI KOMPUTER LAIN
// const API_BASE_URL = 'https://mx5tmd8z-8080.asse.devtunnels.ms/api/v1';
// ===================================================================
const API_BASE_URL = 'https://mx5tmd8z-8080.asse.devtunnels.ms/api/v1'; // Untuk tes lokal

// Ambil elemen dari HTML berdasarkan ID-nya
const uploadForm = document.getElementById('uploadForm');
const statusArea = document.getElementById('statusArea');
const resultArea = document.getElementById('resultArea');

const statusMessage = document.getElementById('statusMessage');
const modelLink = document.getElementById('modelLink');
const resetButton = document.getElementById('resetButton');

let pollingInterval = null; // Variabel untuk menyimpan interval polling

// --- Fungsi Utama untuk Menangani Upload ---
async function handleUpload(event) {
  event.preventDefault(); // Hentikan form dari reload halaman
  
  const formData = new FormData(uploadForm);
  
  // Tampilkan loading dan sembunyikan form
  uploadForm.classList.add('hidden');
  statusArea.classList.remove('hidden');
  resultArea.classList.add('hidden');
  statusMessage.textContent = 'Mengupload gambar...';

  try {
    // 1. Kirim gambar ke backend (POST)
    const response = await fetch(`${API_BASE_URL}/image2d-to-3d`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.job_id) {
      throw new Error(result.error || 'Gagal memulai pekerjaan.');
    }

    const jobID = result.job_id;
    statusMessage.textContent = `Pekerjaan diterima (ID: ${jobID}). Memproses model 3D... (Estimasi 5-10 mnt)`;

    // 2. Mulai polling status
    pollingInterval = setInterval(() => {
      checkJobStatus(jobID);
    }, 5000); // Cek status setiap 5 detik

  } catch (error) {
    showError(error.message);
  }
}

// --- Fungsi untuk Mengecek Status Pekerjaan ---
async function checkJobStatus(jobID) {
  try {
    const response = await fetch(`${API_BASE_URL}/status/${jobID}`);
    
    if (!response.ok) {
      console.warn(`Gagal mengambil status untuk ${jobID}, Status: ${response.status}`);
      // Jika job not found (404), hentikan polling
      if (response.status === 404) {
          clearInterval(pollingInterval);
          showError(`Job ID ${jobID} tidak ditemukan.`);
      }
      return; // Coba lagi nanti jika error sementara
    }

    const result = await response.json();

    // 3. Tangani berbagai status
    if (result.status === 'processing') {
      console.log(`Job ${jobID}: Masih diproses...`);
      statusMessage.textContent = `Status [${jobID}]: Masih memproses... Mohon tunggu.`;

    } else if (result.status === 'completed') {
      console.log(`Job ${jobID}: Selesai!`);
      clearInterval(pollingInterval); // Hentikan polling
      showSuccess(result.model_url);

    } else if (result.status === 'failed') {
      console.error(`Job ${jobID}: Gagal!`);
      clearInterval(pollingInterval); // Hentikan polling
      showError(result.error || 'Proses gagal karena error tidak diketahui.');
    }

  } catch (error) {
    console.error('Error saat polling:', error);
    // Jangan hentikan polling, mungkin hanya masalah jaringan sementara
  }
}

// --- Fungsi Helper untuk UI ---

// Tampilkan UI Sukses
function showSuccess(modelUrl) {
  statusArea.classList.add('hidden');
  resultArea.classList.remove('hidden');
  modelLink.href = modelUrl;
}

// Tampilkan UI Error
function showError(errorMessage) {
  statusArea.classList.remove('hidden'); // Pastikan area status terlihat
  resultArea.classList.add('hidden');   // Sembunyikan area hasil

  // Sembunyikan spinner
  const spinner = statusArea.querySelector('.spinner');
  if (spinner) {
    spinner.style.display = 'none';
  }
  
  statusMessage.textContent = `Error: ${errorMessage}`;
  
  // Tambahkan tombol "Coba Lagi" jika belum ada
  if (!statusArea.querySelector('.link-button')) {
      const btn = document.createElement('button');
      btn.textContent = 'Coba Lagi';
      btn.className = 'link-button'; // Gunakan class dari style.css
      btn.onclick = resetUI;
      statusArea.appendChild(btn);
  }
}

// Reset UI ke awal
function resetUI() {
  uploadForm.classList.remove('hidden');
  statusArea.classList.add('hidden');
  resultArea.classList.add('hidden');
  
  // Reset form
  uploadForm.reset();
  
  // Reset status area
  const spinner = statusArea.querySelector('.spinner');
  if (spinner) {
    spinner.style.display = 'block'; // Tampilkan lagi spinner
  }
  statusMessage.textContent = 'Mengupload gambar...';
  
  // Hapus tombol "Coba Lagi"
  const retryButton = statusArea.querySelector('.link-button');
  if (retryButton) {
    retryButton.remove();
  }
}

// --- Ikat Event Listener ---
uploadForm.addEventListener('submit', handleUpload);
resetButton.addEventListener('click', resetUI);