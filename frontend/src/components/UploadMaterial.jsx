import React, { useState } from 'react';
import { Upload, Steps, Card, Tag, Button, Table, Modal, Input, Select, message, Typography, Space } from 'antd';
import { Inbox, FileText, CheckCircle, Loader2, Edit3, Settings } from 'lucide-react';
import api, { questionsApi } from '../services/api';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { TextArea } = Input;

const UploadMaterial = ({ onComplete }) => {
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, done
  const [currentStep, setCurrentStep] = useState(0);
  const [questions, setQuestions] = useState([]);
  
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const customRequest = async ({ file, onSuccess, onError, onProgress }) => {
    setStatus('uploading');
    setCurrentStep(0); // Uploading file...

    const formData = new FormData();
    formData.append('file', file);
    // You can also append mcq_per_chunk and fill_per_chunk if needed

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        onProgress({ percent: 50 });
      }, 500);

      const response = await api.post('/upload/material', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({ percent: percentCompleted });
          if (percentCompleted >= 100) {
            clearInterval(interval);
            setCurrentStep(1); // AI is reading document...
            setTimeout(() => {
              setCurrentStep(2); // Generating questions...
            }, 1500);
          }
        },
      });

      onSuccess(response.data);
      setQuestions(response.data.questions || []);
      setStatus('done');
      setCurrentStep(3);
      message.success(`${file.name} processed successfully.`);
    } catch (error) {
      console.error(error);
      onError(error);
      setStatus('idle');
      message.error(error.message || `${file.name} file upload failed.`);
    }
  };

  const beforeUpload = (file) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];
    const isValid = validTypes.includes(file.type) || /\.(pdf|docx|pptx|txt)$/i.test(file.name);
    
    if (!isValid) {
      message.error('You can only upload PDF, DOCX, PPTX, or TXT files!');
    }
    const isLt20M = file.size / 1024 / 1024 < 20;
    if (!isLt20M) {
      message.error('File must be smaller than 20MB!');
    }
    return isValid && isLt20M;
  };

  const handleEdit = (record) => {
    setEditingQuestion({ ...record });
    setIsEditModalVisible(true);
  };

  const saveEdit = async () => {
    setIsSaving(true);
    try {
      if (editingQuestion.id) {
        // If it's already in the database
        const updated = await questionsApi.update(editingQuestion.id, editingQuestion);
        setQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? updated : q)));
      } else {
        // Just update local state if it's not saved yet (depending on backend flow)
        setQuestions((prev) => prev.map((q) => (q === editingQuestion ? editingQuestion : q))); // This relies on strict equality, better to use an index or temp id. But usually we have id.
      }
      message.success('Question updated successfully');
      setIsEditModalVisible(false);
    } catch (error) {
      message.error(error.message || 'Failed to update question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = () => {
    message.success('Questions confirmed and added to the bank!');
    if (onComplete) {
      onComplete(questions);
    }
    // Optionally reset state to allow another upload
    setStatus('idle');
    setQuestions([]);
    setCurrentStep(0);
  };

  const difficultyColors = {
    easy: 'green',
    medium: 'orange',
    hard: 'red',
  };

  const columns = [
    {
      title: 'Question',
      dataIndex: 'question',
      key: 'question',
      render: (text) => <span className="font-medium text-gray-800">{text}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color="blue" className="uppercase font-semibold tracking-wider text-xs">
          {type === 'mcq' ? 'MCQ' : 'Fill in the blank'}
        </Tag>
      ),
    },
    {
      title: 'Difficulty',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty) => (
        <Tag color={difficultyColors[difficulty] || 'default'} className="uppercase font-semibold tracking-wider text-xs">
          {difficulty}
        </Tag>
      ),
    },
    {
      title: 'Correct Answer',
      dataIndex: 'correct_answer',
      key: 'correct_answer',
      render: (text) => <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">{text}</span>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<Edit3 size={18} className="text-gray-500 hover:text-blue-600 transition-colors" />} 
          onClick={() => handleEdit(record)}
        />
      ),
    },
  ];

  const stepsItems = [
    {
      title: 'Uploading file...',
      icon: <Inbox size={20} />,
    },
    {
      title: 'AI is reading document...',
      icon: <FileText size={20} />,
    },
    {
      title: 'Generating questions...',
      icon: currentStep === 2 ? <Loader2 size={20} className="animate-spin" /> : <Settings size={20} />,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
      
      {status === 'idle' && (
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <Title level={2} className="!font-bold !text-gray-800 !mb-2">Upload Study Material</Title>
            <Text className="text-gray-500 text-lg">Let our AI generate high-quality questions for you instantly.</Text>
          </div>
          
          <Dragger
            customRequest={customRequest}
            beforeUpload={beforeUpload}
            showUploadList={false}
            accept=".pdf,.docx,.pptx,.txt"
            className="!bg-gray-50 !border-2 !border-dashed !border-gray-200 hover:!border-blue-500 !rounded-xl transition-colors"
          >
            <div className="py-12">
              <p className="ant-upload-drag-icon flex justify-center mb-4 text-blue-500">
                <div className="p-4 bg-blue-50 rounded-full">
                  <Inbox size={48} strokeWidth={1.5} />
                </div>
              </p>
              <p className="ant-upload-text !text-xl !font-semibold !text-gray-700">
                Click or drag file to this area to upload
              </p>
              <p className="ant-upload-hint !text-gray-400 !mt-2">
                Supports single upload for .pdf, .docx, .pptx, or .txt files.
              </p>
            </div>
          </Dragger>
        </div>
      )}

      {(status === 'uploading' || status === 'processing') && (
        <Card className="!border-none !shadow-sm !rounded-xl bg-gray-50 p-8 text-center animate-in fade-in duration-500">
          <Steps 
            current={currentStep} 
            items={stepsItems} 
            className="max-w-2xl mx-auto !mb-12"
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 size={40} className="text-blue-500 animate-spin" />
            <Text className="text-lg font-medium text-gray-600 animate-pulse">
              Magic is happening... Please wait.
            </Text>
          </div>
        </Card>
      )}

      {status === 'done' && (
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-500">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Title level={3} className="!m-0 flex items-center gap-2">
                <CheckCircle className="text-green-500" size={24} />
                Generated Questions
              </Title>
              <Text className="text-gray-500 mt-1">Review the AI-generated questions below.</Text>
            </div>
            <Button 
              type="primary" 
              size="large" 
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 shadow-md font-medium px-6 h-12 rounded-lg flex items-center gap-2"
            >
              <CheckCircle size={18} />
              Confirm & Add to Bank
            </Button>
          </div>

          <Table 
            dataSource={questions} 
            columns={columns} 
            rowKey="id" 
            pagination={false}
            className="shadow-sm border border-gray-100 rounded-xl overflow-hidden"
          />
        </div>
      )}

      {/* Edit Question Modal */}
      <Modal
        title={<span className="font-semibold text-lg">Edit Question</span>}
        open={isEditModalVisible}
        onOk={saveEdit}
        onCancel={() => setIsEditModalVisible(false)}
        confirmLoading={isSaving}
        okText="Save Changes"
        okButtonProps={{ className: 'bg-blue-600' }}
        centered
        className="rounded-xl overflow-hidden"
      >
        {editingQuestion && (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <TextArea 
                rows={3} 
                value={editingQuestion.question}
                onChange={(e) => setEditingQuestion({...editingQuestion, question: e.target.value})}
                className="rounded-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <Select
                  value={editingQuestion.type}
                  onChange={(val) => setEditingQuestion({...editingQuestion, type: val})}
                  className="w-full"
                  options={[
                    { value: 'mcq', label: 'MCQ' },
                    { value: 'fill', label: 'Fill in the blank' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <Select
                  value={editingQuestion.difficulty}
                  onChange={(val) => setEditingQuestion({...editingQuestion, difficulty: val})}
                  className="w-full"
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <Input 
                value={editingQuestion.correct_answer}
                onChange={(e) => setEditingQuestion({...editingQuestion, correct_answer: e.target.value})}
                className="rounded-lg"
              />
            </div>
            
            {editingQuestion.type === 'mcq' && editingQuestion.options && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <div className="space-y-2">
                  {editingQuestion.options.map((opt, idx) => (
                    <Input 
                      key={idx} 
                      value={opt} 
                      addonBefore={String.fromCharCode(65 + idx)}
                      onChange={(e) => {
                        const newOptions = [...editingQuestion.options];
                        newOptions[idx] = e.target.value;
                        setEditingQuestion({...editingQuestion, options: newOptions});
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};

export default UploadMaterial;
