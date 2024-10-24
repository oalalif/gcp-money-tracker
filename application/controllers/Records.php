<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Records extends CI_Controller {

    public function __construct() {
        parent::__construct();

        $this->load->helper('url');
        $this->load->model('record_model');
    }

    public function index() {
        $data['records'] = $this->record_model->getAllRecords();
        $this->load->view('my_records', $data);
    }

    public function add() {
        $this->load->helper(array('form', 'url'));
        $this->load->library('form_validation');

        $this->form_validation->set_rules('amount', 'Amount', 'required|numeric');
        $this->form_validation->set_rules('name', 'Name', 'required|min_length[3]');
        $this->form_validation->set_rules('date', 'Date', 'required|valid_date');
        $this->form_validation->set_rules('recordtype', 'Record Type', 'required|in_list[expense,income]');

        if ($this->form_validation->run() === FALSE) {
            $this->load->view('add_records');
        } else {
            $files = !empty($_FILES['attachment']['tmp_name']) ? fopen($_FILES['attachment']['tmp_name'], 'r') : null;
            $this->record_model->insertRecord($files);
            redirect('records');
        }
    }

    public function edit($id) {
        $this->load->helper(array('form', 'url'));
        $this->load->library('form_validation');

        $data['record'] = $this->record_model->getRecordById($id);
        $this->load->view('edit_records', $data);
    }

    public function insertrecord() {
        $files = null;
        if (!empty($_FILES['attachment']['tmp_name'])) {
            $files = fopen($_FILES['attachment']['tmp_name'], 'r');
        }
        $this->record_model->insertRecord($files);
        $this->output->enable_profiler(FALSE);
        redirect('records');
    }

    public function editrecord($id) {
        $this->load->library('form_validation');

        $this->form_validation->set_rules('amount', 'Amount', 'required|numeric');
        $this->form_validation->set_rules('name', 'Name', 'required|min_length[3]');
        $this->form_validation->set_rules('date', 'Date', 'required|valid_date');
        $this->form_validation->set_rules('recordtype', 'Record Type', 'required|in_list[expense,income]');

        if ($this->form_validation->run() == FALSE) {
            $this->edit($id);
        } else {
            $this->record_model->updateRecord($id);
            redirect('records');
        }
    }

    public function delete($id) {
        $this->record_model->deleteRecord($id);
        redirect('records');
    }
}
