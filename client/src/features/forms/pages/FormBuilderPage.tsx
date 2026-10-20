import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Switch,
  Select,
  Row,
  Col,
  InputNumber,
  Radio,
  Checkbox,
  DatePicker,
  Rate,
  Upload,
  Empty,
  Popconfirm,
  App,
  Drawer,
  Tabs,
  Badge,
  Spin,
  Alert,
  Divider,
  Dropdown,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  SendOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HolderOutlined,
  FontSizeOutlined,
  FileTextOutlined,
  NumberOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  DownSquareOutlined,
  CalendarOutlined,
  StarOutlined,
  UploadOutlined,
  TrophyOutlined,
  ShareAltOutlined,
  AppstoreOutlined,
  DownOutlined,
  FolderOpenOutlined,
  EditOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  LockOutlined,
  CheckOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormShareModal } from '../components/FormShareModal';
import { DEFAULT_PDPA_TITLE, DEFAULT_PDPA_CONTENT } from '../constants/pdpa';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthStore } from '../../../store/authStore';
import {
  getFormByIdApi,
  createFormApi,
  updateFormApi,
  publishFormApi,
  FormField,
  FieldType,
  FormType,
  FormVisibility,
  ScoreConfig,
} from '../api/formApi';
import {
  getMchatTemplateSchema,
  MCHAT_SCORE_CONFIG,
  MCHAT_TEMPLATE,
} from '../templates/mchatTemplate';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// รายการ Palette เครื่องมือคำถามสำหรับลากหรือคลิกเพิ่ม
const QUESTION_PALETTE: Array<{ type: FieldType; label: string; icon: React.ReactNode }> = [
  { type: 'text', label: 'ข้อความสั้น (Text)', icon: <FontSizeOutlined /> },
  { type: 'textarea', label: 'ข้อความยาว (Paragraph)', icon: <FileTextOutlined /> },
  { type: 'number', label: 'ตัวเลข (Number)', icon: <NumberOutlined /> },
  { type: 'single_choice', label: 'ตัวเลือกเดียว (Radio)', icon: <CheckCircleOutlined /> },
  { type: 'multi_choice', label: 'หลายตัวเลือก (Checkbox)', icon: <CheckSquareOutlined /> },
  { type: 'dropdown', label: 'รายการเลือก (Dropdown)', icon: <DownSquareOutlined /> },
  { type: 'date', label: 'วันที่ (Date Picker)', icon: <CalendarOutlined /> },
  { type: 'rating', label: 'การให้คะแนน (Rating)', icon: <StarOutlined /> },
  { type: 'file', label: 'อัปโหลดไฟล์/PDF (File)', icon: <UploadOutlined /> },
];

// ฟังก์ชันแปลงค่าเฉลยคำตอบให้ออกมาเป็นข้อความที่เข้าใจง่าย
const getAnswerDisplay = (field: FormField): string => {
  if (field.correctAnswer === undefined || field.correctAnswer === null || field.correctAnswer === '') {
    return '';
  }
  if (field.type === 'single_choice' || field.type === 'dropdown') {
    const opt = field.options?.find((o) => o.id === field.correctAnswer);
    return opt ? opt.label : String(field.correctAnswer);
  }
  if (field.type === 'multi_choice' && Array.isArray(field.correctAnswer)) {
    const labels = field.correctAnswer
      .map((id) => field.options?.find((o) => o.id === id)?.label || id)
      .filter(Boolean);
    return labels.join(', ');
  }
  if (field.type === 'rating') {
    return `${field.correctAnswer} ดาว`;
  }
  return String(field.correctAnswer);
};

// Sortable Item Component สำหรับแต่ละคำถามใน Canvas
interface SortableFieldItemProps {
  field: FormField;
  allFields: FormField[];
  activeFieldId: string | null;
  onSelectField: (id: string) => void;
  onAddFieldToLayer: (layerId: string, type: FieldType) => void;
  onMoveChild: (layerId: string, childIndex: number, direction: 'up' | 'down') => void;
  onDeleteChild: (childId: string) => void;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({
  field,
  allFields,
  activeFieldId,
  onSelectField,
  onAddFieldToLayer,
  onMoveChild,
  onDeleteChild,
  index,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 16,
  };

  const answerText = getAnswerDisplay(field);

  // กรณีเป็นกล่อง Layer Box
  if (field.type === 'layer_box') {
    const childFields = allFields.filter((f) => f.layerId === field.id);
    const layerBoxes = allFields.filter((f) => f.type === 'layer_box');
    const boxIndex = layerBoxes.findIndex((b) => b.id === field.id) + 1;

    return (
      <div ref={setNodeRef} style={style}>
        <Card
          onClick={onSelect}
          style={{
            borderRadius: 14,
            border: isActive ? '2px solid #1677ff' : '2px dashed #95de64',
            backgroundColor: isActive ? '#f0f5ff' : '#f6ffed',
            boxShadow: isActive ? '0 4px 14px rgba(22, 119, 255, 0.15)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          styles={{ body: { padding: '18px 20px' } }}
        >
          {/* Layer Box Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
            }}
          >
            <Space size="middle" align="center" wrap>
              {/* Drag Handle */}
              <div
                {...attributes}
                {...listeners}
                style={{
                  cursor: 'grab',
                  color: '#52c41a',
                  padding: '4px 6px',
                  borderRadius: 4,
                  backgroundColor: '#d9f7be',
                }}
                title="คลิกลากเพื่อย้ายกล่อง"
              >
                <HolderOutlined style={{ fontSize: 16 }} />
              </div>

              <Tag color="success" icon={<AppstoreOutlined />} style={{ fontSize: 13, padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                กล่องที่ {boxIndex}
              </Tag>

              <Text strong style={{ fontSize: 16 }}>
                {field.label || `กล่องข้อมูลที่ ${boxIndex}`}
              </Text>

              <Tag color="blue" style={{ borderRadius: 4 }}>
                {field.columns === 1 ? '1 คอลัมน์' : '2 คอลัมน์ (คู่ขนาน)'}
              </Tag>

              <Tag color="default" style={{ borderRadius: 4 }}>
                {childFields.length} คำถามในกล่อง
              </Tag>
            </Space>

            {/* Action buttons */}
            <Space size="small" onClick={(e) => e.stopPropagation()}>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={isFirst}
                onClick={onMoveUp}
                title="ย้ายกล่องขึ้น"
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={isLast}
                onClick={onMoveDown}
                title="ย้ายกล่องลง"
              />
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={onDuplicate}
                title="ทำซ้ำทั้งกล่องและคำถามภายใน"
              />
              <Popconfirm
                title="ต้องการลบกล่อง Layer Box นี้หรือไม่?"
                description="คำถามทั้งหมดภายในกล่องนี้จะถูกลบไปด้วย ยืนยันหรือไม่?"
                onConfirm={onDelete}
                okText="ลบทั้งกล่อง"
                cancelText="ยกเลิก"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} title="ลบกล่องนี้" />
              </Popconfirm>
            </Space>
          </div>

          {field.description && (
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12, marginLeft: 36 }}>
              {field.description}
            </Paragraph>
          )}

          {/* Child Fields Container */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 10,
              border: '1px solid #d9d9d9',
              padding: 14,
              minHeight: 60,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {childFields.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#8c8c8c' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  กล่องนี้ยังไม่มีคำถามย่อย — คลิกปุ่มด้านล่างเพื่อเพิ่มคำถามลงในกล่อง
                </Text>
              </div>
            ) : (
              <Row gutter={[12, 12]}>
                {childFields.map((child, cIdx) => {
                  const isChildActive = activeFieldId === child.id;
                  const paletteItem = QUESTION_PALETTE.find((p) => p.type === child.type);
                  return (
                    <Col key={child.id} xs={24} sm={child.colSpan || (field.columns === 1 ? 24 : 12)}>
                      <div
                        onClick={() => onSelectField(child.id)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: isChildActive ? '2px solid #1677ff' : '1px solid #e0e0e0',
                          backgroundColor: isChildActive ? '#e6f7ff' : '#fafafa',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Space size={4}>
                            <Text strong style={{ fontSize: 13, color: isChildActive ? '#1677ff' : '#262626' }}>
                              {child.label || 'ระบุชื่อฟิลด์'}
                            </Text>
                            {child.required && (
                              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>*</span>
                            )}
                          </Space>

                          <Space size={2} onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="text"
                              size="small"
                              icon={<ArrowUpOutlined style={{ fontSize: 11 }} />}
                              disabled={cIdx === 0}
                              onClick={() => onMoveChild(field.id, cIdx, 'up')}
                              title="ย้ายขึ้น"
                            />
                            <Button
                              type="text"
                              size="small"
                              icon={<ArrowDownOutlined style={{ fontSize: 11 }} />}
                              disabled={cIdx === childFields.length - 1}
                              onClick={() => onMoveChild(field.id, cIdx, 'down')}
                              title="ย้ายลง"
                            />
                            <Popconfirm
                              title="ลบคำถามนี้ออกจากกล่อง?"
                              onConfirm={() => onDeleteChild(child.id)}
                              okText="ลบ"
                              cancelText="ยกเลิก"
                              okButtonProps={{ danger: true }}
                            >
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                                title="ลบฟิลด์นี้"
                              />
                            </Popconfirm>
                          </Space>
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Tag color="cyan" style={{ fontSize: 11, margin: 0, padding: '0 4px' }}>
                            {paletteItem?.label.split(' ')[0] || child.type}
                          </Tag>
                          <Tag color="default" style={{ fontSize: 11, margin: 0, padding: '0 4px' }}>
                            {child.colSpan === 24 ? 'เต็มแถว' : 'ครึ่งแถว (1/2)'}
                          </Tag>
                          {child.placeholder && (
                            <Text type="secondary" ellipsis style={{ fontSize: 11, maxWidth: 140 }}>
                              {child.placeholder}
                            </Text>
                          )}
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}

            {/* Dropdown: + เพิ่มคำถามลงในกล่องนี้ */}
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Dropdown
                menu={{
                  items: QUESTION_PALETTE.map((p) => ({
                    key: p.type,
                    label: p.label,
                    icon: p.icon,
                    onClick: () => onAddFieldToLayer(field.id, p.type),
                  })),
                }}
                trigger={['click']}
              >
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  style={{ borderRadius: 6, borderColor: '#52c41a', color: '#389e0d' }}
                >
                  + เพิ่มคำถามลงในกล่องนี้ <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // กรณีคำถามทั่วไป Standalone
  return (
    <div ref={setNodeRef} style={style}>
      <Card
        onClick={onSelect}
        style={{
          borderRadius: 12,
          border: isActive ? '2px solid #1677ff' : '1px solid #e8e8e8',
          boxShadow: isActive ? '0 4px 12px rgba(22, 119, 255, 0.15)' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        styles={{ body: { padding: 18 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <Space size="middle" align="center" wrap>
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              style={{
                cursor: 'grab',
                color: '#8c8c8c',
                padding: '4px 6px',
                borderRadius: 4,
                backgroundColor: '#f5f5f5',
              }}
              title="คลิกลากเพื่อเรียงลำดับ"
            >
              <HolderOutlined style={{ fontSize: 16 }} />
            </div>

            <Text strong style={{ fontSize: 16 }}>
              {index + 1}. {field.label || 'ระบุหัวข้อคำถาม'}
            </Text>

            {field.required && (
              <Tag color="red" style={{ borderRadius: 4, fontSize: 11, padding: '1px 6px' }}>
                จำเป็น
              </Tag>
            )}

            {field.points !== undefined && field.points > 0 && (
              <Tag color="gold" icon={<TrophyOutlined />} style={{ borderRadius: 4 }}>
                {field.points} คะแนน
              </Tag>
            )}

            {answerText && (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 4, fontWeight: 500 }}>
                เฉลย: {answerText}
              </Tag>
            )}
          </Space>

          {/* Action buttons */}
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              disabled={isFirst}
              onClick={onMoveUp}
              title="ย้ายขึ้น"
            />
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              disabled={isLast}
              onClick={onMoveDown}
              title="ย้ายลง"
            />
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={onDuplicate}
              title="ทำซ้ำข้อนี้"
            />
            <Popconfirm
              title="ต้องการลบคำถามข้อนี้หรือไม่?"
              onConfirm={onDelete}
              okText="ลบ"
              cancelText="ยกเลิก"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} title="ลบข้อนี้" />
            </Popconfirm>
          </Space>
        </div>

        {field.description && (
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12, marginLeft: 36 }}>
            {field.description}
          </Paragraph>
        )}

        {/* Live Mock Input Field in Canvas */}
        <div style={{ marginLeft: 36, pointerEvents: 'none' }}>
          {field.type === 'text' && (
            <div>
              <Input placeholder={field.placeholder || 'กรอกคำตอบของคุณ...'} disabled />
              {answerText && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    เฉลยคำตอบ: <strong>{answerText}</strong>
                  </Tag>
                </div>
              )}
            </div>
          )}
          {field.type === 'textarea' && (
            <div>
              <Input.TextArea rows={2} placeholder={field.placeholder || 'กรอกคำตอบอย่างละเอียด...'} disabled />
              {answerText && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    แนวคำตอบ/เฉลย: <strong>{answerText}</strong>
                  </Tag>
                </div>
              )}
            </div>
          )}
          {field.type === 'number' && (
            <div>
              <InputNumber placeholder={field.placeholder || '0'} style={{ width: '100%' }} disabled />
              {answerText && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    เฉลยคำตอบ: <strong>{answerText}</strong>
                  </Tag>
                </div>
              )}
            </div>
          )}
          {field.type === 'single_choice' && (
            <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(field.options || []).map((opt) => (
                <Radio key={opt.id} value={opt.id} disabled>
                  {opt.label}
                  {field.correctAnswer === opt.id && (
                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginLeft: 8, fontSize: 11 }}>
                      เฉลยคำตอบที่ถูกต้อง
                    </Tag>
                  )}
                </Radio>
              ))}
            </Radio.Group>
          )}
          {field.type === 'multi_choice' && (
            <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(field.options || []).map((opt) => (
                <Checkbox key={opt.id} value={opt.id} disabled>
                  {opt.label}
                  {Array.isArray(field.correctAnswer) && field.correctAnswer.includes(opt.id) && (
                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginLeft: 8, fontSize: 11 }}>
                      เฉลยคำตอบที่ถูกต้อง
                    </Tag>
                  )}
                </Checkbox>
              ))}
            </Checkbox.Group>
          )}
          {field.type === 'dropdown' && (
            <div>
              <Select placeholder={field.placeholder || 'เลือกคำตอบ'} style={{ width: '100%' }} disabled>
                {(field.options || []).map((opt) => (
                  <Option key={opt.id} value={opt.id}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
              {answerText && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    เฉลยคำตอบ: <strong>{answerText}</strong>
                  </Tag>
                </div>
              )}
            </div>
          )}
          {field.type === 'date' && (
            <div>
              <DatePicker style={{ width: '100%' }} disabled />
              {answerText && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    เฉลย: <strong>{answerText}</strong>
                  </Tag>
                </div>
              )}
            </div>
          )}
          {field.type === 'rating' && (
            <div>
              <Rate disabled defaultValue={0} />
              {answerText && (
                <div style={{ marginTop: 8 }}>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    เฉลย: <strong>{answerText}</strong>
                  </Tag>
                </div>
              )}
            </div>
          )}
          {field.type === 'file' && (
            <Upload disabled>
              <Button icon={<UploadOutlined />}>คลิกเพื่ออัปโหลดไฟล์</Button>
            </Upload>
          )}
        </div>
      </Card>
    </div>
  );
};

export const FormBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // States
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState(isNew ? 'แบบฟอร์มไม่มีชื่อ' : '');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<FormType>('GENERAL');
  const [formVisibility, setFormVisibility] = useState<FormVisibility>('PRIVATE');
  const [pdpaEnabled, setPdpaEnabled] = useState(false);
  const [pdpaTitle, setPdpaTitle] = useState(DEFAULT_PDPA_TITLE);
  const [pdpaContent, setPdpaContent] = useState(DEFAULT_PDPA_CONTENT);
  const [scoreConfig, setScoreConfig] = useState<ScoreConfig>({
    passScore: 60,
    passType: 'percent',
    showResultToUser: true,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showAnswerInPreview, setShowAnswerInPreview] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // 1. ดึงรายละเอียดฟอร์มจากเซิร์ฟเวอร์ (เฉพาะกรณีฟอร์มที่มีอยู่แล้ว)
  const { data: formDetail, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: () => getFormByIdApi(id!, true),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (isNew) {
      setFormTitle('แบบฟอร์มไม่มีชื่อ');
      setFormDescription('');
      setFormType('GENERAL');
      setFormVisibility('PRIVATE');
      setPdpaEnabled(false);
      setPdpaTitle(DEFAULT_PDPA_TITLE);
      setPdpaContent(DEFAULT_PDPA_CONTENT);
      setFields([]);
    } else if (formDetail) {
      setFormTitle(formDetail.title);
      setFormDescription(formDetail.description || '');
      setFormType(formDetail.type);
      setFormVisibility(formDetail.visibility || 'PRIVATE');
      setPdpaEnabled(Boolean(formDetail.pdpaEnabled));
      setPdpaTitle(formDetail.pdpaTitle || DEFAULT_PDPA_TITLE);
      setPdpaContent(formDetail.pdpaContent || DEFAULT_PDPA_CONTENT);
      setFields(formDetail.schema || []);
      if (formDetail.schema && formDetail.schema.length > 0 && !activeFieldId) {
        setActiveFieldId(formDetail.schema[0].id);
      }
      if (formDetail.scoreConfig) {
        setScoreConfig(formDetail.scoreConfig);
      }
    }
  }, [isNew, formDetail]);

  const isScoreTest = formType === 'SCORE_TEST';

  // 2. Mutation: บันทึกและสร้างแบบฟอร์มใหม่ (กรณี Create)
  const createMutation = useMutation({
    mutationFn: () =>
      createFormApi({
        title: formTitle.trim() || 'แบบฟอร์มไม่มีชื่อ',
        description: formDescription,
        type: formType,
        visibility: formVisibility,
        departmentId: formVisibility === 'DEPARTMENT' ? (currentUser?.departmentId || undefined) : undefined,
        pdpaEnabled,
        pdpaTitle,
        pdpaContent,
        schema: fields,
        scoreConfig: isScoreTest ? scoreConfig : undefined,
      }),
    onSuccess: (newForm) => {
      message.success(`บันทึกแบบฟอร์ม "${newForm.title}" สำเร็จแล้ว`);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      // สลับ URL ไปยัง id จริงโดยไม่ reload
      navigate(`/forms/${newForm.id}/builder`, { replace: true });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'บันทึกแบบฟอร์มไม่สำเร็จ');
    },
  });

  // 3. Mutation: บันทึกการแก้ไขแบบฟอร์มเดิม (กรณี Edit)
  const updateMutation = useMutation({
    mutationFn: () =>
      updateFormApi(id!, {
        title: formTitle.trim() || 'แบบฟอร์มไม่มีชื่อ',
        description: formDescription,
        type: formType,
        visibility: formVisibility,
        departmentId: formVisibility === 'DEPARTMENT' ? (formDetail?.departmentId || currentUser?.departmentId || undefined) : undefined,
        pdpaEnabled,
        pdpaTitle,
        pdpaContent,
        schema: fields,
        scoreConfig: isScoreTest ? scoreConfig : undefined,
      }),
    onSuccess: () => {
      message.success('บันทึกการแก้ไขเรียบร้อยแล้ว');
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'บันทึกไม่สำเร็จ');
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ฟังก์ชันกดปุ่มบันทึก (Save)
  const handleSave = () => {
    if (isNew) {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  // ฟังก์ชันกดย้อนกลับหน้ารายการ (ถ้าไม่ได้กด Save จะไม่สร้างหรือแก้ไขใน DB)
  const handleBack = () => {
    if (isNew && (fields.length > 0 || (formTitle && formTitle !== 'แบบฟอร์มไม่มีชื่อ'))) {
      modal.confirm({
        title: 'ยังไม่ได้บันทึกแบบฟอร์ม',
        content: 'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้กด Save หากกลับหน้ารายการ ฟอร์มนี้จะไม่ถูกสร้างในระบบ ยืนยันหรือไม่?',
        okText: 'ออกจากหน้านี้ (ไม่สร้างฟอร์ม)',
        cancelText: 'อยู่หน้านี้ต่อ',
        okButtonProps: { danger: true },
        onOk: () => navigate('/forms'),
      });
      return;
    }
    navigate('/forms');
  };

  const publishMutation = useMutation({
    mutationFn: () =>
      publishFormApi(id!, {
        schema: fields,
        scoreConfig: isScoreTest ? scoreConfig : undefined,
      }),
    onSuccess: (data) => {
      message.success(`เผยแพร่แบบฟอร์มสำเร็จ (เวอร์ชัน ${data.version})`);
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'เผยแพร่ไม่สำเร็จ');
    },
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Top-level fields (fields that are not children of any layer)
  const topLevelFields = fields.filter((f) => !f.layerId);

  // Group fields into chunks: [layer_box, ...children] or [standalone_field]
  const getFieldChunks = (allFields: FormField[]) => {
    const top = allFields.filter((f) => !f.layerId);
    return top.map((t) => {
      if (t.type === 'layer_box') {
        const children = allFields.filter((c) => c.layerId === t.id);
        return [t, ...children];
      }
      return [t];
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const top = fields.filter((f) => !f.layerId);
      const oldIndex = top.findIndex((i) => i.id === active.id);
      const newIndex = top.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const chunks = getFieldChunks(fields);
        const movedChunks = arrayMove(chunks, oldIndex, newIndex);
        setFields(movedChunks.flat());
      }
    }
  };

  // Field Operations: Standalone
  const handleAddField = (type: FieldType) => {
    const newId = `field_${Date.now()}`;
    const defaultOptions =
      type === 'single_choice' || type === 'multi_choice' || type === 'dropdown'
        ? [
            { id: 'opt_1', label: 'ตัวเลือกที่ 1' },
            { id: 'opt_2', label: 'ตัวเลือกที่ 2' },
          ]
        : undefined;

    const newField: FormField = {
      id: newId,
      type,
      label: `คำถามข้อที่ ${fields.filter((f) => f.type !== 'layer_box').length + 1}`,
      required: false,
      options: defaultOptions,
      points: isScoreTest ? 1 : undefined,
    };

    setFields([...fields, newField]);
    setActiveFieldId(newId);
  };

  // Layer Box Operations: Add Layer Box
  const handleAddLayerBox = () => {
    const newId = `layer_${Date.now()}`;
    const currentBoxCount = fields.filter((f) => f.type === 'layer_box').length + 1;
    const newLayer: FormField = {
      id: newId,
      type: 'layer_box',
      label: `กล่องที่ ${currentBoxCount}: กล่องข้อมูล`,
      description: '',
      required: false,
      columns: 2,
    };
    setFields([...fields, newLayer]);
    setActiveFieldId(newId);
    message.success(`เพิ่มกล่องที่ ${currentBoxCount} เรียบร้อยแล้ว`);
  };

  // Layer Box Operations: Add Child Info Template (ตรงตามตัวอย่างรูปเป๊ะๆ)
  const handleAddChildInfoTemplate = () => {
    const layerId = `layer_${Date.now()}`;
    const now = Date.now();
    const templateFields: FormField[] = [
      {
        id: layerId,
        type: 'layer_box',
        label: 'ข้อมูลเด็ก',
        description: '',
        required: false,
        columns: 2,
      },
      {
        id: `field_${now}_1`,
        type: 'text',
        label: 'ชื่อ-นามสกุลเด็ก',
        placeholder: '',
        required: true,
        layerId: layerId,
        colSpan: 12,
      },
      {
        id: `field_${now}_2`,
        type: 'text',
        label: 'HN (ถ้ามี)',
        placeholder: '',
        required: false,
        layerId: layerId,
        colSpan: 12,
      },
      {
        id: `field_${now}_3`,
        type: 'date',
        label: 'วันเกิดเด็ก',
        placeholder: 'mm/dd/yyyy',
        required: true,
        layerId: layerId,
        colSpan: 12,
      },
      {
        id: `field_${now}_4`,
        type: 'number',
        label: 'อายุ (เดือน)',
        placeholder: 'คำนวณจากวันเกิดอัตโนมัติ',
        required: false,
        layerId: layerId,
        colSpan: 12,
      },
      {
        id: `field_${now}_5`,
        type: 'text',
        label: 'ผู้ตอบแบบสอบถาม',
        placeholder: 'เช่น มารดา บิดา ผู้ดูแล',
        required: false,
        layerId: layerId,
        colSpan: 12,
      },
      {
        id: `field_${now}_6`,
        type: 'date',
        label: 'วันที่ทำแบบสอบถาม',
        placeholder: '',
        required: true,
        layerId: layerId,
        colSpan: 12,
      },
    ];

    setFields((prev) => [...prev, ...templateFields]);
    setActiveFieldId(layerId);
    message.success('เพิ่มกล่องข้อมูลเด็ก (Template) สำเร็จ');
  };

  // โหลดชุดแบบสอบถาม M-CHAT-R ฉบับภาษาไทย ทั้งชุด 20 ข้อพร้อม Layer Box
  const handleLoadMchatTemplate = () => {
    setFormTitle(MCHAT_TEMPLATE.title);
    setFormDescription(MCHAT_TEMPLATE.description);
    setFormType('SCORE_TEST');
    setFields(getMchatTemplateSchema());
    setScoreConfig(MCHAT_SCORE_CONFIG);
    setActiveFieldId(null);
    message.success('โหลดชุดแบบคัดกรอง M-CHAT-R ฉบับภาษาไทย (27 ฟิลด์) สำเร็จ');
  };

  // Add a field inside a specific Layer Box
  const handleAddFieldToLayer = (layerId: string, type: FieldType) => {
    const newId = `field_${Date.now()}`;
    const defaultOptions =
      type === 'single_choice' || type === 'multi_choice' || type === 'dropdown'
        ? [
            { id: 'opt_1', label: 'ตัวเลือกที่ 1' },
            { id: 'opt_2', label: 'ตัวเลือกที่ 2' },
          ]
        : undefined;

    const newField: FormField = {
      id: newId,
      type,
      label: `คำถามย่อย`,
      required: false,
      options: defaultOptions,
      layerId: layerId,
      colSpan: 12,
      points: isScoreTest ? 1 : undefined,
    };

    const layerChildren = fields.filter((f) => f.layerId === layerId);
    let insertIndex = fields.findIndex((f) => f.id === layerId);
    if (layerChildren.length > 0) {
      const lastChild = layerChildren[layerChildren.length - 1];
      insertIndex = fields.findIndex((f) => f.id === lastChild.id);
    }

    const newFields = [...fields];
    newFields.splice(insertIndex + 1, 0, newField);
    setFields(newFields);
    setActiveFieldId(newId);
    message.success('เพิ่มคำถามลงในกล่องสำเร็จ');
  };

  // Move child within its Layer Box
  const handleMoveChildInLayer = (
    layerId: string,
    childIndex: number,
    direction: 'up' | 'down'
  ) => {
    const targetChildIndex = direction === 'up' ? childIndex - 1 : childIndex + 1;
    const layerChildren = fields.filter((f) => f.layerId === layerId);
    if (targetChildIndex < 0 || targetChildIndex >= layerChildren.length) return;

    const currentChild = layerChildren[childIndex];
    const targetChild = layerChildren[targetChildIndex];

    const currentIdx = fields.findIndex((f) => f.id === currentChild.id);
    const targetIdx = fields.findIndex((f) => f.id === targetChild.id);

    if (currentIdx !== -1 && targetIdx !== -1) {
      const newFields = [...fields];
      newFields[currentIdx] = targetChild;
      newFields[targetIdx] = currentChild;
      setFields(newFields);
    }
  };

  // Delete a single field by ID (e.g. child inside layer)
  const handleDeleteFieldById = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (activeFieldId === fieldId) {
      setActiveFieldId(null);
    }
  };

  // Delete top-level item (if layer_box, deletes layer + its children)
  const handleDeleteTopLevel = (topFieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== topFieldId && f.layerId !== topFieldId));
    if (activeFieldId === topFieldId) {
      setActiveFieldId(null);
    }
  };

  // Duplicate top-level item (if layer_box, duplicates layer + all children with new IDs)
  const handleDuplicateTopLevel = (topFieldId: string) => {
    const topField = fields.find((f) => f.id === topFieldId);
    if (!topField) return;

    if (topField.type === 'layer_box') {
      const newLayerId = `layer_${Date.now()}`;
      const newLayer: FormField = {
        ...topField,
        id: newLayerId,
        label: `${topField.label} (สำเนา)`,
      };
      const childFields = fields.filter((f) => f.layerId === topFieldId);
      const newChildren: FormField[] = childFields.map((child, idx) => ({
        ...child,
        id: `field_${Date.now()}_${idx}`,
        layerId: newLayerId,
      }));

      const topIdx = fields.findIndex((f) => f.id === topFieldId);
      const newFields = [...fields];
      newFields.splice(topIdx + 1, 0, newLayer, ...newChildren);
      setFields(newFields);
      setActiveFieldId(newLayerId);
    } else {
      const newId = `field_${Date.now()}`;
      const newField: FormField = {
        ...topField,
        id: newId,
        label: `${topField.label} (สำเนา)`,
      };
      const topIdx = fields.findIndex((f) => f.id === topFieldId);
      const newFields = [...fields];
      newFields.splice(topIdx + 1, 0, newField);
      setFields(newFields);
      setActiveFieldId(newId);
    }
  };

  // Move top-level item up or down
  const handleMoveTopLevel = (topIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? topIndex - 1 : topIndex + 1;
    const top = fields.filter((f) => !f.layerId);
    if (targetIndex >= 0 && targetIndex < top.length) {
      const chunks = getFieldChunks(fields);
      const movedChunks = arrayMove(chunks, topIndex, targetIndex);
      setFields(movedChunks.flat());
    }
  };

  const activeField = fields.find((f) => f.id === activeFieldId);

  const updateActiveField = (patch: Partial<FormField>) => {
    if (!activeFieldId) return;
    setFields((prev) =>
      prev.map((f) => (f.id === activeFieldId ? { ...f, ...patch } : f))
    );
  };

  // คำนวณคะแนนเต็มรวมทั้งหมดของฟอร์ม (ไม่รวมกล่อง layer_box)
  const totalPoints = fields.reduce(
    (sum, f) => sum + (f.type !== 'layer_box' ? f.points || 0 : 0),
    0
  );

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="กำลังโหลด Form Studio..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      {/* Top Navigation & Action Header */}
      <Card
        style={{ marginBottom: 16, borderRadius: 12 }}
        styles={{ body: { padding: '12px 24px' } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space size="middle" align="center">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ borderRadius: 8 }}
            >
              กลับหน้ารายการ
            </Button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong style={{ fontSize: 11, color: '#1677ff', letterSpacing: '0.3px' }}>
                  <EditOutlined style={{ marginRight: 4 }} />
                  ชื่อแบบฟอร์ม (Form Title):
                </Text>
              </div>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="ระบุชื่อแบบฟอร์ม เช่น แบบประเมินความพึงพอใจ..."
                allowClear
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  width: 380,
                  borderRadius: 8,
                  borderColor: '#91caff',
                  backgroundColor: '#f8fafc',
                  boxShadow: '0 1px 3px rgba(22,119,255,0.06)',
                  padding: '5px 12px',
                }}
              />
              <div style={{ paddingLeft: 2, display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                <Tag color={formType === 'SCORE_TEST' ? 'gold' : 'blue'} style={{ borderRadius: 4, margin: 0 }}>
                  {formType === 'SCORE_TEST' ? '🏆 ข้อสอบวัดผล' : '📝 ฟอร์มทั่วไป'}
                </Tag>
                {formType === 'SCORE_TEST' && (
                  <Tag color="volcano" icon={<TrophyOutlined />} style={{ borderRadius: 4, margin: 0 }}>
                    คะแนนเต็ม: {totalPoints} คะแนน
                  </Tag>
                )}
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'PRIVATE',
                        icon: <LockOutlined style={{ color: '#fa8c16' }} />,
                        label: (
                          <Space>
                            <span>ส่วนบุคคล (Private)</span>
                            {formVisibility === 'PRIVATE' && <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold' }} />}
                          </Space>
                        ),
                        onClick: () => setFormVisibility('PRIVATE'),
                      },
                      {
                        key: 'DEPARTMENT',
                        icon: <ApartmentOutlined style={{ color: '#722ed1' }} />,
                        label: (
                          <Space>
                            <span>เฉพาะแผนก (Department)</span>
                            {formVisibility === 'DEPARTMENT' && <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold' }} />}
                          </Space>
                        ),
                        onClick: () => {
                          if (!currentUser?.departmentId && !formDetail?.departmentId) {
                            message.warning('คุณยังไม่ได้สังกัดแผนก จึงไม่สามารถตั้งค่าแบบฟอร์มเฉพาะแผนกได้');
                            return;
                          }
                          setFormVisibility('DEPARTMENT');
                        },
                      },
                      {
                        key: 'PUBLIC',
                        icon: <GlobalOutlined style={{ color: '#52c41a' }} />,
                        label: (
                          <Space>
                            <span>ทุกคนในองค์กร (Public)</span>
                            {formVisibility === 'PUBLIC' && <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold' }} />}
                          </Space>
                        ),
                        onClick: () => setFormVisibility('PUBLIC'),
                      },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Tag
                    color={formVisibility === 'PUBLIC' ? 'green' : formVisibility === 'DEPARTMENT' ? 'purple' : 'orange'}
                    icon={formVisibility === 'PUBLIC' ? <GlobalOutlined /> : formVisibility === 'DEPARTMENT' ? <ApartmentOutlined /> : <LockOutlined />}
                    style={{ borderRadius: 4, margin: 0, cursor: 'pointer', userSelect: 'none' }}
                    title="คลิกเพื่อเปลี่ยนสิทธิ์การเข้าถึง"
                  >
                    {formVisibility === 'PUBLIC' ? 'ทุกคน (Public)' : formVisibility === 'DEPARTMENT' ? 'เฉพาะแผนก' : 'ส่วนบุคคล (Private)'} ▾
                  </Tag>
                </Dropdown>
                {isNew ? (
                  <Tag color="orange" style={{ borderRadius: 4, margin: 0 }}>
                    ยังไม่บันทึก (Unsaved)
                  </Tag>
                ) : (
                  <Badge
                    status={formDetail?.status === 'PUBLISHED' ? 'success' : 'default'}
                    text={`เวอร์ชัน ${formDetail?.currentVersionNumber || 1}`}
                  />
                )}
              </div>
            </div>
          </Space>

          <Space size="middle">
            {!isNew && (
              <Button
                icon={<BarChartOutlined style={{ color: '#1677ff' }} />}
                onClick={() => navigate(`/forms/${id}/submissions`)}
                style={{ height: 40, fontWeight: 500 }}
              >
                วิเคราะห์ข้อมูล ({formDetail?.submissionsCount || 0})
              </Button>
            )}

            {!isNew && (
              <Button
                icon={<ShareAltOutlined />}
                onClick={() => setShareModalOpen(true)}
                style={{ height: 40, fontWeight: 500 }}
              >
                แชร์ฟอร์ม
              </Button>
            )}

            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => setTemplateModalOpen(true)}
              style={{ height: 40, fontWeight: 500 }}
            >
              แม่แบบ (Templates)
            </Button>

            <Button
              icon={<EyeOutlined />}
              onClick={() => setPreviewOpen(true)}
              style={{ height: 40, fontWeight: 500 }}
            >
              ดูตัวอย่าง (Preview)
            </Button>

            {/* ปุ่มบันทึกหลัก (Save) */}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={handleSave}
              style={{
                height: 40,
                fontWeight: 600,
                backgroundColor: '#52c41a',
                borderColor: '#52c41a',
                minWidth: 120,
              }}
            >
              บันทึก (Save)
            </Button>

            {!isNew && (
              <Popconfirm
                title="เผยแพร่แบบฟอร์ม (Publish)"
                description="เมื่อเผยแพร่ ระบบจะสร้างเวอร์ชันใหม่ และเปิดให้สมาชิกกรอกได้ทันที ยืนยันหรือไม่?"
                okText="เผยแพร่ทันที"
                cancelText="ยกเลิก"
                onConfirm={() => publishMutation.mutate()}
              >
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={publishMutation.isPending}
                  style={{ height: 40, fontWeight: 600 }}
                >
                  เผยแพร่ฟอร์ม
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </Card>

      {/* Main 3-Column Studio Layout */}
      <Row gutter={[16, 16]}>
        {/* Column 1: Toolbox / Component Palette */}
        <Col xs={24} md={6} lg={5}>
          <Card
            title={<Text strong>เพิ่มคำถาม (Toolbox)</Text>}
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: 14 } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* ส่วนโครงสร้างเลย์เอาต์ (Layout) */}
              <div>
                <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                  📐 โครงสร้างเลย์เอาต์ (Layout)
                </Text>
                <Button
                  icon={<AppstoreOutlined />}
                  onClick={handleAddLayerBox}
                  style={{
                    width: '100%',
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    fontSize: 13,
                    borderRadius: 8,
                  }}
                >
                  กล่อง Layer Box (2 คอลัมน์)
                </Button>
              </div>

              <Divider style={{ margin: '4px 0' }} />

              {/* ส่วนคำถามเดี่ยวทั่วไป */}
              <div>
                <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                  📝 คำถามทั่วไป (Questions)
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {QUESTION_PALETTE.map((item) => (
                    <Button
                      key={item.type}
                      icon={item.icon}
                      onClick={() => handleAddField(item.type)}
                      style={{
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        fontSize: 13,
                        borderRadius: 8,
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Column 2: Canvas Area */}
        <Col xs={24} md={18} lg={12}>
          <div style={{ minHeight: 600 }}>
            {topLevelFields.length === 0 ? (
              <Card style={{ borderRadius: 12, textAlign: 'center', padding: '60px 0' }}>
                <Empty
                  description="ยังไม่มีคำถามในแบบฟอร์มนี้"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Space wrap style={{ justifyContent: 'center' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddField('text')}
                    >
                      คลิกเพื่อเพิ่มคำถามแรก
                    </Button>
                    <Button
                      icon={<AppstoreOutlined />}
                      onClick={handleAddLayerBox}
                    >
                      เพิ่มกล่อง Layer Box
                    </Button>
                    <Button
                      icon={<FolderOpenOutlined />}
                      onClick={() => setTemplateModalOpen(true)}
                    >
                      เลือกจากแม่แบบ (Templates)
                    </Button>
                  </Space>
                </Empty>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={topLevelFields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {topLevelFields.map((field, index) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      allFields={fields}
                      activeFieldId={activeFieldId}
                      onSelectField={(fId) => setActiveFieldId(fId)}
                      onAddFieldToLayer={(layerId, type) => handleAddFieldToLayer(layerId, type)}
                      onMoveChild={(layerId, cIdx, dir) => handleMoveChildInLayer(layerId, cIdx, dir)}
                      onDeleteChild={(childId) => handleDeleteFieldById(childId)}
                      index={index}
                      isActive={activeFieldId === field.id}
                      onSelect={() => setActiveFieldId(field.id)}
                      onDelete={() => handleDeleteTopLevel(field.id)}
                      onDuplicate={() => handleDuplicateTopLevel(field.id)}
                      onMoveUp={() => handleMoveTopLevel(index, 'up')}
                      onMoveDown={() => handleMoveTopLevel(index, 'down')}
                      isFirst={index === 0}
                      isLast={index === topLevelFields.length - 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </Col>

        {/* Column 3: Properties Inspector Panel */}
        <Col xs={24} lg={7}>
          <Card
            style={{ borderRadius: 12, position: 'sticky', top: 80 }}
            styles={{ body: { padding: 18 } }}
          >
            <Tabs
              defaultActiveKey="field"
              items={[
                {
                  key: 'field',
                  label: activeField?.type === 'layer_box' ? 'ตั้งค่ากล่อง Layer Box' : 'ตั้งค่าคำถาม',
                  children: activeField ? (
                    activeField.type === 'layer_box' ? (
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Alert
                          type="success"
                          showIcon
                          icon={<AppstoreOutlined />}
                          message="กล่องจัดกลุ่มข้อมูล (Layer Box)"
                          description="ใช้จัดกลุ่มคำถามเข้าด้วยกัน สามารถแสดงผลเป็น 2 คอลัมน์คู่ขนานในหน้าแบบฟอร์ม"
                        />

                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 6 }}>
                            ชื่อหัวข้อกล่อง (Title)
                          </Text>
                          <Input
                            value={activeField.label}
                            onChange={(e) => updateActiveField({ label: e.target.value })}
                            size="large"
                            placeholder="เช่น ข้อมูลเด็ก, ข้อมูลผู้ป่วย"
                          />
                        </div>

                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 6 }}>
                            คำอธิบายกล่อง (Description)
                          </Text>
                          <Input.TextArea
                            rows={2}
                            value={activeField.description || ''}
                            onChange={(e) => updateActiveField({ description: e.target.value })}
                            placeholder="คำอธิบายเพิ่มเติมสำหรับกลุ่มคำถามนี้ (ถ้ามี)"
                          />
                        </div>

                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 6 }}>
                            การจัดวางคอลัมน์ (Columns)
                          </Text>
                          <Radio.Group
                            value={activeField.columns || 2}
                            onChange={(e) => updateActiveField({ columns: e.target.value })}
                            optionType="button"
                            buttonStyle="solid"
                            style={{ width: '100%', display: 'flex' }}
                          >
                            <Radio.Button value={2} style={{ flex: 1, textAlign: 'center' }}>
                              2 คอลัมน์ (คู่ขนาน)
                            </Radio.Button>
                            <Radio.Button value={1} style={{ flex: 1, textAlign: 'center' }}>
                              1 คอลัมน์ (เดี่ยว)
                            </Radio.Button>
                          </Radio.Group>
                        </div>

                        <Divider style={{ margin: '8px 0' }} />

                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            คำถามในกล่องนี้ ({fields.filter((f) => f.layerId === activeField.id).length} ข้อ)
                          </Text>
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {fields
                              .filter((f) => f.layerId === activeField.id)
                              .map((child, idx) => (
                                <div
                                  key={child.id}
                                  onClick={() => setActiveFieldId(child.id)}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    background: '#fafafa',
                                    borderRadius: 6,
                                    border: '1px solid #f0f0f0',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Text ellipsis style={{ maxWidth: 180, fontSize: 13 }}>
                                    {idx + 1}. {child.label}
                                  </Text>
                                  <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                                    {child.colSpan === 24 ? 'เต็มแถว' : 'ครึ่งแถว'}
                                  </Tag>
                                </div>
                              ))}

                            <Dropdown
                              menu={{
                                items: QUESTION_PALETTE.map((p) => ({
                                  key: p.type,
                                  label: p.label,
                                  icon: p.icon,
                                  onClick: () => handleAddFieldToLayer(activeField.id, p.type),
                                })),
                              }}
                              trigger={['click']}
                            >
                              <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 6 }}>
                                + เพิ่มคำถามลงในกล่องนี้
                              </Button>
                            </Dropdown>
                          </Space>
                        </div>
                      </Space>
                    ) : (
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 6 }}>
                            หัวข้อคำถาม (Question Label)
                          </Text>
                        <Input
                          value={activeField.label}
                          onChange={(e) => updateActiveField({ label: e.target.value })}
                          size="large"
                          placeholder="ระบุหัวข้อคำถาม เช่น 1+2 = เท่าไร"
                        />
                      </div>

                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 6 }}>
                          คำอธิบายเพิ่มเติม (Description)
                        </Text>
                        <Input.TextArea
                          rows={2}
                          value={activeField.description || ''}
                          onChange={(e) => updateActiveField({ description: e.target.value })}
                          placeholder="คำอธิบายข้อคำถาม (ถ้ามี)"
                        />
                      </div>

                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 6 }}>
                          Placeholder (ข้อความจางแนะนำ)
                        </Text>
                        <Input
                          value={activeField.placeholder || ''}
                          onChange={(e) => updateActiveField({ placeholder: e.target.value })}
                          placeholder="เช่น ระบุตัวเลขคำตอบ"
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong style={{ display: 'block' }}>จำเป็นต้องตอบ (Required)</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>ผู้ทำฟอร์มต้องตอบข้อนี้ก่อนส่ง</Text>
                        </div>
                        <Switch
                          checked={activeField.required}
                          onChange={(checked) => updateActiveField({ required: checked })}
                        />
                      </div>

                      {/* Options Manager for choice fields */}
                      {activeField.options && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>
                            ตัวเลือกคำตอบ (Options)
                          </Text>
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {activeField.options.map((opt, optIdx) => (
                              <div key={opt.id} style={{ display: 'flex', gap: 8 }}>
                                <Input
                                  value={opt.label}
                                  onChange={(e) => {
                                    const newOpts = [...activeField.options!];
                                    newOpts[optIdx].label = e.target.value;
                                    updateActiveField({ options: newOpts });
                                  }}
                                  placeholder={`ตัวเลือกที่ ${optIdx + 1}`}
                                />
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  disabled={activeField.options!.length <= 1}
                                  onClick={() => {
                                    const newOpts = activeField.options!.filter((_, i) => i !== optIdx);
                                    // หากตัวเลือกที่ถูกลบเป็นเฉลยคำตอบ ให้เคลียร์ออก
                                    let newAns = activeField.correctAnswer;
                                    if (newAns === opt.id) newAns = undefined;
                                    if (Array.isArray(newAns)) newAns = newAns.filter((id) => id !== opt.id);
                                    updateActiveField({ options: newOpts, correctAnswer: newAns });
                                  }}
                                />
                              </div>
                            ))}
                            <Button
                              type="dashed"
                              block
                              icon={<PlusOutlined />}
                              onClick={() => {
                                const newOpts = [
                                  ...activeField.options!,
                                  {
                                    id: `opt_${Date.now()}`,
                                    label: `ตัวเลือกที่ ${activeField.options!.length + 1}`,
                                  },
                                ];
                                updateActiveField({ options: newOpts });
                              }}
                            >
                              เพิ่มตัวเลือก
                            </Button>
                          </Space>
                        </div>
                      )}

                      {/* Section: เกณฑ์คะแนนและเฉลยคำตอบ (Answer Key & Scoring) */}
                      <Card
                        style={{
                          backgroundColor: isScoreTest ? '#f6ffed' : '#fafafa',
                          border: isScoreTest ? '1px solid #b7eb8f' : '1px solid #e8e8e8',
                          borderRadius: 10,
                          marginTop: 12,
                        }}
                        styles={{ body: { padding: 14 } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Space size={6}>
                            <TrophyOutlined style={{ color: isScoreTest ? '#52c41a' : '#8c8c8c', fontSize: 16 }} />
                            <Text strong style={{ fontSize: 14 }}>
                              🎯 เฉลยคำตอบและคะแนน
                            </Text>
                          </Space>
                          {isScoreTest ? (
                            <Tag color="success">ข้อสอบวัดผล</Tag>
                          ) : (
                            <Tag color="default">ฟอร์มทั่วไป</Tag>
                          )}
                        </div>

                        {!isScoreTest && (
                          <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 12, fontSize: 12, padding: '6px 10px' }}
                            message={
                              <span>
                                ฟอร์มนี้ตั้งเป็น <b>ฟอร์มทั่วไป</b> แต่ท่านสามารถกำหนดเฉลยและคะแนนได้ หรือ{' '}
                                <a onClick={() => setFormType('SCORE_TEST')}>
                                  คลิกเพื่อเปลี่ยนเป็นข้อสอบวัดผล (Score Test)
                                </a>
                              </span>
                            }
                          />
                        )}

                        {/* คะแนนข้อนี้ */}
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                            คะแนนเต็มของข้อนี้ (Points):
                          </Text>
                          <InputNumber
                            min={0}
                            value={activeField.points ?? (isScoreTest ? 1 : 0)}
                            onChange={(val) => updateActiveField({ points: val ?? 0 })}
                            style={{ width: '100%' }}
                            addonAfter="คะแนน"
                          />
                        </div>

                        {/* เฉลยคำตอบตามประเภทคำถาม */}
                        <div>
                          <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                            เฉลยคำตอบที่ถูกต้อง (Answer Key):
                          </Text>

                          {/* 1. ข้อความสั้น (Text) */}
                          {activeField.type === 'text' && (
                            <div>
                              <Input
                                placeholder="ระบุคำตอบที่ถูกต้อง เช่น 3"
                                value={activeField.correctAnswer !== undefined ? String(activeField.correctAnswer) : ''}
                                onChange={(e) => updateActiveField({ correctAnswer: e.target.value })}
                                allowClear
                              />
                              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                                * ระบบจะตรวจคำตอบโดยตัดช่องว่างหน้า-หลัง (Trim) และไม่สนใจตัวพิมพ์เล็ก-ใหญ่
                              </Text>
                            </div>
                          )}

                          {/* 2. ตัวเลข (Number) */}
                          {activeField.type === 'number' && (
                            <div>
                              <InputNumber
                                placeholder="ระบุตัวเลขคำตอบ เช่น 3"
                                value={
                                  typeof activeField.correctAnswer === 'number'
                                    ? activeField.correctAnswer
                                    : activeField.correctAnswer !== undefined && activeField.correctAnswer !== ''
                                    ? Number(activeField.correctAnswer)
                                    : undefined
                                }
                                onChange={(val) =>
                                  updateActiveField({ correctAnswer: val !== null ? val : undefined })
                                }
                                style={{ width: '100%' }}
                              />
                              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                                * ระบบเปรียบเทียบค่าทางคณิตศาสตร์อย่างแม่นยำ
                              </Text>
                            </div>
                          )}

                          {/* 3. ข้อความยาว (Textarea) */}
                          {activeField.type === 'textarea' && (
                            <div>
                              <Input.TextArea
                                rows={2}
                                placeholder="แนวคำตอบ หรือคีย์เวิร์ดเฉลย"
                                value={activeField.correctAnswer !== undefined ? String(activeField.correctAnswer) : ''}
                                onChange={(e) => updateActiveField({ correctAnswer: e.target.value })}
                                allowClear
                              />
                              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                                * ใช้เป็นแนวคำตอบสำหรับผู้ตรวจ หรือตรวจคีย์เวิร์ด
                              </Text>
                            </div>
                          )}

                          {/* 4. ตัวเลือกเดียว (Radio) */}
                          {activeField.type === 'single_choice' && (
                            <div>
                              {activeField.options && activeField.options.length > 0 ? (
                                <Select
                                  value={activeField.correctAnswer as string | undefined}
                                  onChange={(val) => updateActiveField({ correctAnswer: val })}
                                  style={{ width: '100%' }}
                                  placeholder="-- เลือกตัวเลือกที่ถูกต้อง --"
                                  allowClear
                                >
                                  {activeField.options.map((opt) => (
                                    <Option key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </Option>
                                  ))}
                                </Select>
                              ) : (
                                <Alert
                                  type="warning"
                                  message="กรุณาเพิ่มตัวเลือกคำตอบด้านบนก่อน เพื่อกำหนดเฉลย"
                                  showIcon
                                  style={{ fontSize: 12 }}
                                />
                              )}
                            </div>
                          )}

                          {/* 5. รายการเลือก (Dropdown) */}
                          {activeField.type === 'dropdown' && (
                            <div>
                              {activeField.options && activeField.options.length > 0 ? (
                                <Select
                                  value={activeField.correctAnswer as string | undefined}
                                  onChange={(val) => updateActiveField({ correctAnswer: val })}
                                  style={{ width: '100%' }}
                                  placeholder="-- เลือกตัวเลือกที่ถูกต้อง --"
                                  allowClear
                                >
                                  {activeField.options.map((opt) => (
                                    <Option key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </Option>
                                  ))}
                                </Select>
                              ) : (
                                <Alert
                                  type="warning"
                                  message="กรุณาเพิ่มตัวเลือกคำตอบด้านบนก่อน เพื่อกำหนดเฉลย"
                                  showIcon
                                  style={{ fontSize: 12 }}
                                />
                              )}
                            </div>
                          )}

                          {/* 6. หลายตัวเลือก (Checkbox) */}
                          {activeField.type === 'multi_choice' && (
                            <div>
                              {activeField.options && activeField.options.length > 0 ? (
                                <Select
                                  mode="multiple"
                                  value={Array.isArray(activeField.correctAnswer) ? activeField.correctAnswer : []}
                                  onChange={(val) => updateActiveField({ correctAnswer: val })}
                                  style={{ width: '100%' }}
                                  placeholder="เลือกตัวเลือกที่ถูกต้องทั้งหมด (ตอบถูกครบทุกข้อจึงได้คะแนน)"
                                  allowClear
                                >
                                  {activeField.options.map((opt) => (
                                    <Option key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </Option>
                                  ))}
                                </Select>
                              ) : (
                                <Alert
                                  type="warning"
                                  message="กรุณาเพิ่มตัวเลือกคำตอบด้านบนก่อน เพื่อกำหนดเฉลย"
                                  showIcon
                                  style={{ fontSize: 12 }}
                                />
                              )}
                            </div>
                          )}

                          {/* 7. วันที่ (Date) */}
                          {activeField.type === 'date' && (
                            <Input
                              placeholder="ระบุวันที่เฉลย (เช่น 2026-10-16)"
                              value={activeField.correctAnswer !== undefined ? String(activeField.correctAnswer) : ''}
                              onChange={(e) => updateActiveField({ correctAnswer: e.target.value })}
                              allowClear
                            />
                          )}

                          {/* 8. การให้คะแนน (Rating) */}
                          {activeField.type === 'rating' && (
                            <div style={{ marginTop: 4 }}>
                              <Rate
                                value={Number(activeField.correctAnswer) || 0}
                                onChange={(val) => updateActiveField({ correctAnswer: val })}
                              />
                              <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                                {activeField.correctAnswer ? `${activeField.correctAnswer} ดาว` : 'ยังไม่ได้ระบุ'}
                              </Text>
                            </div>
                          )}

                          {/* 9. อัปโหลดไฟล์ (File) */}
                          {activeField.type === 'file' && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              การส่งไฟล์/PDF ไม่สามารถตรวจเฉลยอัตโนมัติได้ ผู้ตรวจจะให้คะแนนหลังจากผู้ใช้ส่งแบบฟอร์ม
                            </Text>
                          )}
                        </div>
                      </Card>

                      {/* Section: การจัดวางและสังกัดกล่อง (Layout & Container) */}
                      <Card
                        size="small"
                        style={{
                          backgroundColor: '#fafafa',
                          borderRadius: 8,
                          border: '1px solid #e8e8e8',
                          marginTop: 8,
                        }}
                        title={<Text strong style={{ fontSize: 13 }}>📐 การจัดวางและสังกัดกล่อง (Layout)</Text>}
                      >
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                            สังกัดกล่อง Layer Box:
                          </Text>
                          <Select
                            value={activeField.layerId || '__none__'}
                            onChange={(val) => updateActiveField({ layerId: val === '__none__' ? undefined : val })}
                            style={{ width: '100%' }}
                          >
                            <Option value="__none__">ไม่อยู่ในกล่อง (อยู่นอกกล่อง / ฟอร์มหลัก)</Option>
                            {fields
                              .filter((f) => f.type === 'layer_box')
                              .map((box, idx) => (
                                <Option key={box.id} value={box.id}>
                                  📦 กล่องที่ {idx + 1}: {box.label || 'กล่องข้อมูล'}
                                </Option>
                              ))}
                          </Select>
                        </div>

                        <div>
                          <Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                            ความกว้างในแถว (Column Width):
                          </Text>
                          <Select
                            value={activeField.colSpan || 12}
                            onChange={(val) => updateActiveField({ colSpan: val })}
                            style={{ width: '100%' }}
                          >
                            <Option value={12}>ครึ่งแถว (1/2 คอลัมน์ - 12 spans)</Option>
                            <Option value={24}>เต็มแถว (เต็มจอ - 24 spans)</Option>
                          </Select>
                        </div>
                      </Card>
                    </Space>
                  )
                ) : (
                  <Empty description="คลิกเลือกคำถามใน Canvas เพื่อปรับแต่ง" />
                ),
              },
                {
                  key: 'form_config',
                  label: 'ตั้งค่าฟอร์ม',
                  children: (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 6 }}>
                          ชื่อแบบฟอร์ม (Form Title)
                        </Text>
                        <Input
                          prefix={<EditOutlined style={{ color: '#1677ff', marginRight: 4 }} />}
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="ระบุชื่อแบบฟอร์ม..."
                          size="large"
                          style={{ borderRadius: 8 }}
                        />
                      </div>

                      <Divider style={{ margin: '8px 0' }} />

                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 6 }}>
                          รูปแบบของแบบฟอร์ม (Form Type)
                        </Text>
                        <Radio.Group
                          value={formType}
                          onChange={(e) => setFormType(e.target.value)}
                          optionType="button"
                          buttonStyle="solid"
                          style={{ width: '100%', display: 'flex' }}
                        >
                          <Radio.Button value="GENERAL" style={{ flex: 1, textAlign: 'center' }}>
                            📝 ฟอร์มทั่วไป
                          </Radio.Button>
                          <Radio.Button value="SCORE_TEST" style={{ flex: 1, textAlign: 'center' }}>
                            🏆 ข้อสอบวัดผล
                          </Radio.Button>
                        </Radio.Group>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
                          {formType === 'SCORE_TEST'
                            ? 'แบบทดสอบจะมีการคิดคะแนน, ตรวจเฉลยคำตอบ, และตัดเกรดผ่าน/ไม่ผ่านอัตโนมัติ'
                            : 'แบบฟอร์มทั่วไปสำหรับการสำรวจหรือเก็บข้อมูลภายในองค์กร'}
                        </Text>
                      </div>

                      <Divider style={{ margin: '12px 0' }} />

                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>
                          สิทธิ์การเข้าถึงและความเป็นส่วนตัว (Privacy & Visibility)
                        </Text>
                        <Radio.Group
                          value={formVisibility}
                          onChange={(e) => {
                            if (e.target.value === 'DEPARTMENT' && !currentUser?.departmentId && !formDetail?.departmentId) {
                              message.warning('คุณยังไม่ได้สังกัดแผนก จึงไม่สามารถตั้งค่าแบบฟอร์มเฉพาะแผนกได้');
                              return;
                            }
                            setFormVisibility(e.target.value);
                          }}
                          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
                        >
                          <Radio
                            value="PRIVATE"
                            style={{
                              padding: '10px 14px',
                              border: formVisibility === 'PRIVATE' ? '1.5px solid #ffa940' : '1px solid #d9d9d9',
                              borderRadius: 8,
                              margin: 0,
                              width: '100%',
                              backgroundColor: formVisibility === 'PRIVATE' ? '#fff7e6' : '#fff',
                            }}
                          >
                            <Space align="start">
                              <LockOutlined style={{ color: '#fa8c16', fontSize: 16, marginTop: 3 }} />
                              <div>
                                <Text strong style={{ display: 'block', color: formVisibility === 'PRIVATE' ? '#d46b08' : undefined }}>
                                  🔒 ส่วนบุคคล (Private)
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  เฉพาะคุณและผู้ใช้ที่คุณระบุแชร์ให้เท่านั้นที่เข้าถึงได้
                                </Text>
                              </div>
                            </Space>
                          </Radio>

                          <Radio
                            value="DEPARTMENT"
                            style={{
                              padding: '10px 14px',
                              border: formVisibility === 'DEPARTMENT' ? '1.5px solid #b37feb' : '1px solid #d9d9d9',
                              borderRadius: 8,
                              margin: 0,
                              width: '100%',
                              backgroundColor: formVisibility === 'DEPARTMENT' ? '#f9f0ff' : '#fff',
                            }}
                          >
                            <Space align="start">
                              <ApartmentOutlined style={{ color: '#722ed1', fontSize: 16, marginTop: 3 }} />
                              <div>
                                <Text strong style={{ display: 'block', color: formVisibility === 'DEPARTMENT' ? '#531dab' : undefined }}>
                                  🏢 เฉพาะแผนก (Department)
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {currentUser?.department?.name
                                    ? `บุคลากรสังกัด "${currentUser.department.name}" สามารถเข้าถึงได้`
                                    : 'บุคลากรที่สังกัดในแผนกเดียวกันสามารถเข้าถึงได้'}
                                </Text>
                              </div>
                            </Space>
                          </Radio>

                          <Radio
                            value="PUBLIC"
                            style={{
                              padding: '10px 14px',
                              border: formVisibility === 'PUBLIC' ? '1.5px solid #95de64' : '1px solid #d9d9d9',
                              borderRadius: 8,
                              margin: 0,
                              width: '100%',
                              backgroundColor: formVisibility === 'PUBLIC' ? '#f6ffed' : '#fff',
                            }}
                          >
                            <Space align="start">
                              <GlobalOutlined style={{ color: '#52c41a', fontSize: 16, marginTop: 3 }} />
                              <div>
                                <Text strong style={{ display: 'block', color: formVisibility === 'PUBLIC' ? '#389e0d' : undefined }}>
                                  🌐 ทุกคนในองค์กร (Public)
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  บุคลากรทุกคนที่เข้าสู่ระบบสามารถค้นพบและทำแบบฟอร์มได้
                                </Text>
                              </div>
                            </Space>
                          </Radio>
                        </Radio.Group>
                      </div>

                      <Divider style={{ margin: '12px 0' }} />

                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 6 }}>
                          คำชี้แจงแบบฟอร์ม (Description)
                        </Text>
                        <Input.TextArea
                          rows={4}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="คำอธิบายหรือคำแนะนำในการทำแบบฟอร์ม..."
                        />
                      </div>

                      {isScoreTest && (
                        <Card
                          title={<Text strong style={{ fontSize: 14 }}>🏆 เกณฑ์การสอบ (Passing Criteria)</Text>}
                          style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}
                          styles={{ body: { padding: 14 } }}
                        >
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                              เกณฑ์คะแนนผ่าน (%):
                            </Text>
                            <InputNumber
                              min={0}
                              max={100}
                              value={scoreConfig.passScore}
                              onChange={(val) =>
                                setScoreConfig({ ...scoreConfig, passScore: val || 50 })
                              }
                              style={{ width: '100%' }}
                              addonAfter="%"
                            />
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                              (คะแนนรวมปัจจุบัน: {totalPoints} คะแนน, เกณฑ์ผ่าน: {(totalPoints * (scoreConfig.passScore / 100)).toFixed(1)} คะแนน)
                            </Text>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text strong style={{ display: 'block', fontSize: 13 }}>
                                แสดงผลคะแนนให้ผู้สอบเห็น
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                ผู้สอบจะเห็นผลคะแนนและผลผ่าน/ไม่ผ่านทันทีที่ส่ง
                              </Text>
                            </div>
                            <Switch
                              checked={scoreConfig.showResultToUser}
                              onChange={(checked) =>
                                setScoreConfig({ ...scoreConfig, showResultToUser: checked })
                              }
                            />
                          </div>
                        </Card>
                      )}

                      <Divider style={{ margin: '12px 0' }} />

                      {/* ส่วนตั้งค่าข้อตกลง PDPA (PDPA Consent Settings) */}
                      <Card
                        title={
                          <Space size="middle">
                            <SafetyCertificateOutlined style={{ color: pdpaEnabled ? '#52c41a' : '#8c8c8c', fontSize: 18 }} />
                            <span>ข้อตกลงความยินยอมข้อมูลส่วนบุคคล (PDPA)</span>
                          </Space>
                        }
                        size="small"
                        style={{
                          backgroundColor: pdpaEnabled ? '#f6ffed' : '#fafafa',
                          border: `1px solid ${pdpaEnabled ? '#b7eb8f' : '#e2e8f0'}`,
                          borderRadius: 10,
                        }}
                        styles={{ body: { padding: 14 } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: pdpaEnabled ? 12 : 0 }}>
                          <div style={{ paddingRight: 12 }}>
                            <Text strong style={{ display: 'block', fontSize: 13 }}>
                              เปิดใช้ Modal ข้อตกลง PDPA ก่อนเริ่มทำฟอร์ม
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              แสดงหน้าต่างขอความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล ก่อนผู้ตอบจะเริ่มกรอกแบบฟอร์ม
                            </Text>
                          </div>
                          <Switch
                            checked={pdpaEnabled}
                            onChange={(checked) => {
                              setPdpaEnabled(checked);
                              if (checked && !pdpaTitle) setPdpaTitle(DEFAULT_PDPA_TITLE);
                              if (checked && !pdpaContent) setPdpaContent(DEFAULT_PDPA_CONTENT);
                            }}
                          />
                        </div>

                        {pdpaEnabled && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #d9d9d9' }}>
                            <div style={{ marginBottom: 10 }}>
                              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                หัวข้อข้อตกลง (PDPA Title):
                              </Text>
                              <Input
                                value={pdpaTitle}
                                onChange={(e) => setPdpaTitle(e.target.value)}
                                placeholder="ระบุหัวข้อ เช่น ข้อตกลงและเงื่อนไขการคุ้มครองข้อมูลส่วนบุคคล..."
                                style={{ borderRadius: 6 }}
                              />
                            </div>

                            <div style={{ marginBottom: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 12 }}>
                                  ข้อความและเงื่อนไขความยินยอม (Consent Terms):
                                </Text>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    setPdpaTitle(DEFAULT_PDPA_TITLE);
                                    setPdpaContent(DEFAULT_PDPA_CONTENT);
                                    message.info('โหลดข้อความ PDPA มาตรฐานเรียบร้อย');
                                  }}
                                  style={{ padding: 0, fontSize: 11, height: 'auto' }}
                                >
                                  📋 ใช้ข้อความมาตรฐาน
                                </Button>
                              </div>
                              <Input.TextArea
                                rows={6}
                                value={pdpaContent}
                                onChange={(e) => setPdpaContent(e.target.value)}
                                placeholder="พิมพ์เงื่อนไขและข้อตกลงการเก็บรวบรวมข้อมูลส่วนบุคคลที่นี่..."
                                style={{ borderRadius: 6, fontSize: 12 }}
                              />
                            </div>

                            <Alert
                              type="info"
                              showIcon
                              style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6 }}
                              message="เมื่อเปิดใช้งาน ผู้ตอบฟอร์ม (ทั้งในระบบ, ผ่าน iPad, หรือบุคคลภายนอก) จะต้องกดยินยอมใน Modal ก่อน จึงจะสามารถกรอกฟอร์มได้"
                            />
                          </div>
                        )}
                      </Card>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Preview Modal / Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
            <span>ตัวอย่างแบบฟอร์ม: {formTitle}</span>
            <Space size="small">
              <Text style={{ fontSize: 13 }}>แสดงเฉลยคำตอบ:</Text>
              <Switch
                size="small"
                checked={showAnswerInPreview}
                onChange={setShowAnswerInPreview}
              />
            </Space>
          </div>
        }
        placement="right"
        width={740}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      >
        <div style={{ maxWidth: 660, margin: '0 auto', paddingBottom: 40 }}>
          <div style={{ marginBottom: 20 }}>
            <Title level={3} style={{ marginBottom: 8 }}>{formTitle || 'ไม่มีชื่อแบบฟอร์ม'}</Title>
            <Space wrap style={{ marginBottom: 12 }}>
              <Tag color={isScoreTest ? 'gold' : 'blue'}>
                {isScoreTest ? '🏆 ข้อสอบวัดผล' : '📝 แบบฟอร์มทั่วไป'}
              </Tag>
              {isScoreTest && (
                <Tag color="volcano">คะแนนเต็ม: {totalPoints} คะแนน</Tag>
              )}
            </Space>
            {formDescription && (
              <Paragraph type="secondary" style={{ whiteSpace: 'pre-line' }}>
                {formDescription}
              </Paragraph>
            )}
          </div>

          {/* Preview Inputs Helper */}
          {(() => {
            const renderPreviewInput = (field: FormField) => {
              switch (field.type) {
                case 'text':
                  return <Input placeholder={field.placeholder || 'กรอกคำตอบ...'} size="large" />;
                case 'textarea':
                  return <Input.TextArea rows={3} placeholder={field.placeholder || 'กรอกคำตอบ...'} />;
                case 'number':
                  return <InputNumber placeholder={field.placeholder || '0'} style={{ width: '100%' }} size="large" />;
                case 'single_choice':
                  return (
                    <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(field.options || []).map((opt) => (
                        <Radio key={opt.id} value={opt.id} style={{ fontSize: 15 }}>
                          {opt.label}
                          {showAnswerInPreview && field.correctAnswer === opt.id && (
                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginLeft: 8 }}>
                              เฉลย
                            </Tag>
                          )}
                        </Radio>
                      ))}
                    </Radio.Group>
                  );
                case 'multi_choice':
                  return (
                    <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(field.options || []).map((opt) => (
                        <Checkbox key={opt.id} value={opt.id} style={{ fontSize: 15 }}>
                          {opt.label}
                          {showAnswerInPreview &&
                            Array.isArray(field.correctAnswer) &&
                            field.correctAnswer.includes(opt.id) && (
                              <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginLeft: 8 }}>
                                เฉลย
                              </Tag>
                            )}
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                  );
                case 'dropdown':
                  return (
                    <Select placeholder={field.placeholder || 'กรุณาเลือก'} style={{ width: '100%' }} size="large">
                      {(field.options || []).map((opt) => (
                        <Option key={opt.id} value={opt.id}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  );
                case 'date':
                  return <DatePicker style={{ width: '100%', height: 40 }} size="large" />;
                case 'rating':
                  return <Rate allowHalf style={{ fontSize: 26 }} />;
                case 'file':
                  return (
                    <Upload>
                      <Button icon={<UploadOutlined />} size="large">
                        เลือกไฟล์อัปโหลด
                      </Button>
                    </Upload>
                  );
                default:
                  return null;
              }
            };

            const top = fields.filter((f) => !f.layerId);
            let qIndex = 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {top.map((field) => {
                  if (field.type === 'layer_box') {
                    const childFields = fields.filter((c) => c.layerId === field.id);
                    return (
                      <Card
                        key={field.id}
                        style={{ borderRadius: 14, border: '1px solid #d9d9d9', backgroundColor: '#ffffff' }}
                        styles={{ body: { padding: 20 } }}
                      >
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ fontSize: 17, color: '#1f1f1f' }}>
                            {field.label || 'กล่องข้อมูล (Layer Box)'}
                          </Text>
                          {field.description && (
                            <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                              {field.description}
                            </Text>
                          )}
                        </div>
                        <Row gutter={[16, 16]}>
                          {childFields.map((child) => (
                            <Col key={child.id} xs={24} sm={child.colSpan || (field.columns === 1 ? 24 : 12)}>
                              <div>
                                <div style={{ marginBottom: 6 }}>
                                  <Text strong style={{ fontSize: 14 }}>
                                    {child.label}
                                    {child.required && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
                                  </Text>
                                  {child.description && (
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                                      {child.description}
                                    </Text>
                                  )}
                                </div>
                                {renderPreviewInput(child)}
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    );
                  }

                  qIndex++;
                  const answerText = getAnswerDisplay(field);
                  return (
                    <Card key={field.id} style={{ borderRadius: 12 }}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Text strong style={{ fontSize: 16 }}>
                            {qIndex}. {field.label}
                            {field.required && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
                          </Text>
                          {field.points !== undefined && field.points > 0 && (
                            <Tag color="gold" icon={<TrophyOutlined />}>
                              {field.points} คะแนน
                            </Tag>
                          )}
                        </div>
                        {field.description && (
                          <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                            {field.description}
                          </Text>
                        )}
                      </div>

                      <div>{renderPreviewInput(field)}</div>

                      {showAnswerInPreview && answerText && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: '8px 12px',
                            backgroundColor: '#f6ffed',
                            borderRadius: 6,
                            border: '1px solid #b7eb8f',
                          }}
                        >
                          <Text type="success" strong style={{ fontSize: 13 }}>
                            <CheckCircleOutlined style={{ marginRight: 6 }} />
                            เฉลยคำตอบ: {answerText}
                          </Text>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            );
          })()}

          <Button type="primary" size="large" block style={{ marginTop: 28, height: 48, fontSize: 16 }}>
            ส่งคำตอบ (จำลอง)
          </Button>
        </div>
      </Drawer>

      {/* Share Modal */}
      <FormShareModal
        formId={id || null}
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Form Templates Modal */}
      <Modal
        title={
          <Space>
            <FolderOpenOutlined style={{ color: '#1677ff' }} />
            <span>เลือกแม่แบบฟอร์มสำเร็จรูป (Form Templates)</span>
          </Space>
        }
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        footer={null}
        width={680}
        centered
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          เลือกแม่แบบสำเร็จรูปที่ต้องการเพื่อเริ่มต้นสร้างฟอร์มอย่างรวดเร็ว โดยไม่จำเป็นต้องสร้างฟิลด์ทีละข้อ
        </Paragraph>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Template 1: M-CHAT-R Full */}
          <Card
            size="small"
            hoverable
            style={{ borderRadius: 10, border: '1.5px solid #d9d9d9' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Space size="small" wrap>
                  <Tag color="gold" icon={<TrophyOutlined />}>แบบประเมิน / คัดกรอง</Tag>
                  <Tag color="cyan">27 ฟิลด์ (ข้อมูลเด็ก 6 + คำถาม 20)</Tag>
                  <Tag color="blue">ระบบคำนวณคะแนนอัตโนมัติ</Tag>
                </Space>
                <Title level={5} style={{ margin: '8px 0 4px 0' }}>
                  แบบสอบถาม M-CHAT-R ฉบับภาษาไทย (ทั้งชุด)
                </Title>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', lineHeight: 1.5 }}>
                  แบบคัดกรองภาวะออทิซึมสเปกตรัมในเด็กเล็ก (16–30 เดือน) พร้อมกล่องข้อมูลเด็ก 2 คอลัมน์ และข้อคำถาม 20 ข้อ พร้อมระบบตัดเกรดความเสี่ยง 3 ระดับ (ต่ำ/ปานกลาง/สูง)
                </Text>
              </div>
              <Popconfirm
                title="โหลดแม่แบบ M-CHAT-R ทั้งชุด"
                description="ระบบจะแทนที่เนื้อหาฟอร์มปัจจุบันด้วยแม่แบบ M-CHAT-R ทั้งชุด ยืนยันหรือไม่?"
                onConfirm={() => {
                  handleLoadMchatTemplate();
                  setTemplateModalOpen(false);
                }}
                okText="ยืนยันนำเข้า"
                cancelText="ยกเลิก"
              >
                <Button type="primary" style={{ flexShrink: 0, fontWeight: 500 }}>
                  นำเข้าทั้งชุด
                </Button>
              </Popconfirm>
            </div>
          </Card>

          {/* Template 2: Child Info Layer Box */}
          <Card
            size="small"
            hoverable
            style={{ borderRadius: 10, border: '1.5px solid #d9d9d9' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Space size="small" wrap>
                  <Tag color="blue" icon={<AppstoreOutlined />}>กล่อง Layer Box</Tag>
                  <Tag color="geekblue">6 ฟิลด์ย่อย (2 คอลัมน์)</Tag>
                </Space>
                <Title level={5} style={{ margin: '8px 0 4px 0' }}>
                  กล่องข้อมูลเด็ก / ผู้รับบริการ (2 คอลัมน์)
                </Title>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', lineHeight: 1.5 }}>
                  กล่องจัดกลุ่มข้อมูล 2 คอลัมน์: ชื่อ-นามสกุล, HN, วันเกิด, อายุ (คำนวณอัตโนมัติ), ผู้ตอบแบบสอบถาม, วันที่
                </Text>
              </div>
              <Button
                onClick={() => {
                  handleAddChildInfoTemplate();
                  setTemplateModalOpen(false);
                }}
                style={{ flexShrink: 0, fontWeight: 500 }}
              >
                + แทรกกล่องนี้
              </Button>
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
};

export default FormBuilderPage;
