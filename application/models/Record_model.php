<?php
use GuzzleHttp\Client;

class Record_model extends CI_Model {

    private $client;

    public function __construct() {
        $this->client = new Client([
            // TODO: Tambahkan Base URL API
            'base_uri' => "https://backend-dot-submission-mgce-fatahillah.et.r.appspot.com",
        ]);
    }

    public function getDataCount() {
        $response = $this->client->request('GET', '/dashboard', []);
        $result = json_decode($response->getBody()->getContents(), true);

        return $result[0];
    }

    public function getLastTenRecords() {
        $response = $this->client->request('GET', '/getlast10records', []);
        $result = json_decode($response->getBody()->getContents(), true);

        return $result;
    }

    public function getTopExpense() {
        $response = $this->client->request('GET', '/gettopexpense', []);
        $result = json_decode($response->getBody()->getContents(), true);

        return $result;
    }

    public function getAllRecords() {
        $response = $this->client->request('GET', '/getrecords', []);
        $result = json_decode($response->getBody()->getContents(), true);

        return $result;
    }

    public function getRecordById($id) {
        $response = $this->client->request('GET', '/getrecord/'.$id, []);
        $result = json_decode($response->getBody()->getContents(), true);

        return $result[0];
    }

    public function insertRecord() {
        $type = $this->input->post('recordtype');
        $amount = $this->input->post('amount');

        if ($type == "expense") {
            $amount = $amount * -1;
        }

        $files = null;
        if (!empty($_FILES['attachment']['tmp_name'])) {
            $files = fopen($_FILES['attachment']['tmp_name'], 'r');
        }

        $multipart = [
            [
                'name' => 'amount',
                'contents' => $amount
            ],
            [
                'name' => 'name',
                'contents' => $this->input->post('name')
            ],
            [
                'name' => 'date',
                'contents' => $this->input->post('date')
            ],
            [
                'name' => 'notes',
                'contents' => $this->input->post('notes')
            ]
        ];

        if ($files !== null) {
            $multipart[] = [
                'name' => 'attachment',
                'contents' => $files
            ];
        }
        $response = $this->client->request('POST', '/insertrecord', [
            'multipart' => $multipart
        ]);
        $result = json_decode($response->getBody()->getContents(), true);

        if (is_resource($files)) {
            fclose($files);
        }
        return $result;
    }


    public function updateRecord($id) {
        $type = $this->input->post('recordtype');
        $amount = $this->input->post('amount');

        if ($type == "expense") {
            $amount = $amount * -1;
        }

        // Inisialisasi variabel `$files` hanya jika ada file yang diunggah
        $files = null;
        if (!empty($_FILES['attachment']['tmp_name'])) {
            $files = fopen($_FILES['attachment']['tmp_name'], 'r');
        }

        // Membangun array `multipart` berdasarkan apakah `$files` ada
        $multipart = [
            [
                'name' => 'amount',
                'contents' => $amount
            ],
            [
                'name' => 'name',
                'contents' => $this->input->post('name')
            ],
            [
                'name' => 'date',
                'contents' => $this->input->post('date')
            ],
            [
                'name' => 'notes',
                'contents' => $this->input->post('notes')
            ]
        ];

        // Tambahkan bagian `attachment` hanya jika file ada
        if ($files) {
            $multipart[] = [
                'name' => 'attachment',
                'contents' => $files
            ];
        }
        $response = $this->client->request('PUT', '/editrecord/'.$id, [
            'multipart' => $multipart
        ]);

        $result = json_decode($response->getBody()->getContents(), true);

        // Tutup handle file jika dibuka
        if (is_resource($files)) {
            fclose($files);
        }
        return $result;
    }

    public function searchRecords($keyword) {
        try {
            // Menggunakan endpoint search yang sudah ada di backend
            $response = $this->client->request('GET', '/searchrecords', [
                'query' => ['s' => $keyword]
            ]);
            
            $result = json_decode($response->getBody()->getContents(), true);
            return $result;
        } catch (Exception $e) {
            return [];
        }
    }
    
    public function deleteRecord($id) {
        $response = $this->client->request('DELETE', '/deleterecord/'.$id, []);
        $result = json_decode($response->getBody()->getContents(), true);

        return $result;
    }
}