import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/auth';
import type { RegisterRequest } from '../types/api';
import { toast } from 'sonner';
import { User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    password: '',
    phone: '',
    email: '',
    studentId: '',
    name: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (!formData.username || !formData.password || !formData.phone || !formData.email || !formData.studentId || !formData.name) {
      toast.error('请填写所有必填项');
      return;
    }
    setLoading(true);
    try {
      await authAPI.register(formData);
      toast.success('注册成功，请登录');
      navigate('/login');
    } catch (error: any) {
      console.error('注册失败:', error);
      toast.error(error?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'username', label: '用户名 *', placeholder: '3-20位字母数字下划线', icon: User, type: 'text' },
    { name: 'name', label: '姓名 *', placeholder: '真实姓名', icon: User, type: 'text' },
    { name: 'studentId', label: '学号 *', placeholder: '12位数字', icon: User, type: 'text' },
    { name: 'email', label: '邮箱 *', placeholder: 'example@mail.com', icon: Mail, type: 'email' },
    { name: 'phone', label: '手机号 *', placeholder: '11位手机号', icon: Phone, type: 'tel' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">校园二手交易</h1>
          <p className="text-gray-500 text-sm mt-1">注册新账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.name} className={f.name === 'email' || f.name === 'studentId' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <f.icon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={f.type}
                    name={f.name}
                    value={(formData as any)[f.name]}
                    onChange={handleChange}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={f.placeholder}
                    required
                  />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">密码 *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400" /></div>
                <input type={showPw ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="6-20位，必须含字母和数字" required />
                <button type="button" className="absolute inset-y-0 right-0 pr-2 flex items-center" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">确认密码 *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400" /></div>
                <input type={showCp ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="再次输入密码" required />
                <button type="button" className="absolute inset-y-0 right-0 pr-2 flex items-center" onClick={() => setShowCp(!showCp)}>{showCp ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}</button>
              </div>
            </div>
          </div>
          {formData.password !== confirmPassword && confirmPassword && (
            <p className="text-xs text-red-500">两次输入的密码不一致</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{background:'linear-gradient(135deg, #2563eb, #7c3aed)'}}
          >
            {loading ? '注册中...' : '注册'}
          </button>

          <div className="text-center text-sm">
            <Link to="/login" className="text-blue-600 hover:text-blue-500">已有账号？去登录</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
