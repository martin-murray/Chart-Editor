import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = login(username, password);
    if (success) {
      setLocation('/');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="h-16 w-16 rounded-full bg-[#5AF5FA]/10 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-[#5AF5FA]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-light tracking-wide" style={{ fontFamily: 'var(--font-serif)' }}>
            Stock Market Tracker
          </CardTitle>
          <CardDescription className="text-base" style={{ fontFamily: 'var(--font-sans)' }}>
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label 
                htmlFor="username" 
                className="text-sm font-normal"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Username
              </Label>
              <Input
                id="username"
                type="email"
                placeholder="test@intropic.io"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 bg-input border-border/50 focus:border-[#5AF5FA] focus:ring-[#5AF5FA]/20"
                style={{ fontFamily: 'var(--font-sans)' }}
                data-testid="input-username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label 
                htmlFor="password" 
                className="text-sm font-normal"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-input border-border/50 focus:border-[#5AF5FA] focus:ring-[#5AF5FA]/20"
                style={{ fontFamily: 'var(--font-sans)' }}
                data-testid="input-password"
                required
              />
            </div>
            {error && (
              <div 
                className="text-sm text-red-400 text-center p-3 rounded-md bg-red-500/10 border border-red-500/20"
                style={{ fontFamily: 'var(--font-sans)' }}
                data-testid="text-error"
              >
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-[#5AF5FA] hover:bg-[#5AF5FA]/90 text-black font-medium transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
              data-testid="button-login"
            >
              Sign In
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
              Real-time market analytics powered by Intropic
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
