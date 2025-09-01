import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, Clock, CheckCircle, Package, AlertTriangle } from 'lucide-react';
import { firebaseHelpers } from '../firebase/config';

const Dashboard = () => {
  const [shortages, setShortages] = useState([]);
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, quarter, year
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseHelpers.getShortages((snapshot) => {
      const data = snapshot.val();
      if (data) {
        const shortagesList = Object.entries(data).map(([id, shortage]) => ({
          id,
          ...shortage,
          timeSpent: calculateTimeSpent(shortage),
          timeOpen: calculateTimeOpen(shortage)
        }));
        setShortages(shortagesList);
      } else {
        setShortages([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const calculateTimeSpent = (shortage) => {
    const created = new Date(shortage.shortageDate || shortage.createdAt);
    const resolved = shortage.resolvedAt ? new Date(shortage.resolvedAt) : new Date();
    const diffTime = Math.abs(resolved - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateTimeOpen = (shortage) => {
    if (shortage.status === 'received') return 0;
    const created = new Date(shortage.shortageDate || shortage.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTimeWindow = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case 'quarter':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case 'year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default:
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
  };

  const getFilteredByCreated = () => {
    const windowStart = getTimeWindow();
    return shortages.filter(shortage => {
      const createdDate = new Date(shortage.shortageDate || shortage.createdAt);
      return createdDate >= windowStart;
    });
  };

  const getFilteredByResolved = () => {
    const windowStart = getTimeWindow();
    return shortages.filter(shortage => {
      if (!shortage.resolvedAt) return false;
      const resolvedDate = new Date(shortage.resolvedAt);
      return resolvedDate >= windowStart;
    });
  };

  const getKPIs = () => {
    const createdInWindow = getFilteredByCreated();
    const resolvedInWindow = getFilteredByResolved();
    const currentOpen = shortages.filter(s => s.status !== 'received');
    const netOpenDelta = createdInWindow.length - resolvedInWindow.length;

    // SLA calculations
    const resolvedCases = shortages.filter(s => s.status === 'received');
    const within7Days = resolvedCases.filter(s => s.timeSpent <= 7).length;
    const within14Days = resolvedCases.filter(s => s.timeSpent <= 14).length;
    const sla7 = resolvedCases.length > 0 ? Math.round((within7Days / resolvedCases.length) * 100) : 0;
    const sla14 = resolvedCases.length > 0 ? Math.round((within14Days / resolvedCases.length) * 100) : 0;

    return {
      newCases: createdInWindow.length,
      resolvedCases: resolvedInWindow.length,
      currentOpen: currentOpen.length,
      netOpenDelta,
      sla7,
      sla14
    };
  };

  const getWeeklyTrendData = () => {
    // Get data for the last 12 weeks
    const weeks = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
      
      // Get week label (e.g., "Week 45")
      const weekNumber = Math.ceil(((weekStart - new Date(weekStart.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
      const weekLabel = `W${weekNumber}`;
      
      // Count shortages created in this week
      const createdThisWeek = shortages.filter(shortage => {
        const createdDate = new Date(shortage.shortageDate || shortage.createdAt);
        return createdDate >= weekStart && createdDate <= weekEnd;
      }).length;
      
      // Count shortages resolved within 7 days that were created in this week
      const resolvedWithin7Days = shortages.filter(shortage => {
        const createdDate = new Date(shortage.shortageDate || shortage.createdAt);
        const isCreatedThisWeek = createdDate >= weekStart && createdDate <= weekEnd;
        const isResolvedWithin7Days = shortage.status === 'received' && shortage.timeSpent <= 7;
        return isCreatedThisWeek && isResolvedWithin7Days;
      }).length;
      
      weeks.push({
        week: weekLabel,
        created: createdThisWeek,
        resolvedIn7Days: resolvedWithin7Days
      });
    }
    
    return weeks;
  };

  const getSourceDistribution = () => {
    const createdInWindow = getFilteredByCreated();
    const sourceCounts = {};
    
    createdInWindow.forEach(shortage => {
      const source = shortage.source || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts).map(([source, count]) => ({
      name: source.charAt(0).toUpperCase() + source.slice(1),
      value: count
    }));
  };

  const getOpenHealthDistribution = () => {
    const openCases = shortages.filter(s => s.status !== 'received');
    const healthData = {
      '0-7 days': 0,
      '8-14 days': 0,
      '>14 days': 0
    };

    openCases.forEach(shortage => {
      const timeOpen = shortage.timeOpen;
      if (timeOpen <= 7) {
        healthData['0-7 days']++;
      } else if (timeOpen <= 14) {
        healthData['8-14 days']++;
      } else {
        healthData['>14 days']++;
      }
    });

    return Object.entries(healthData).map(([period, count]) => ({
      name: period,
      value: count
    }));
  };

  const getTeamPerformanceData = () => {
    // Get ALL cases with assigned teams (both resolved and unfinished)
    const allCasesWithTeams = shortages.filter(s => s.assignedTeam);
    
    // Group by team and calculate average total time (including unfinished cases)
    const teamStats = {};
    
    allCasesWithTeams.forEach(shortage => {
      const team = shortage.assignedTeam;
      if (!teamStats[team]) {
        teamStats[team] = {
          totalTime: 0,
          count: 0,
          cases: []
        };
      }
      // Use timeSpent for resolved cases, timeOpen for unfinished cases
      const timeToUse = shortage.status === 'received' ? shortage.timeSpent : shortage.timeOpen;
      teamStats[team].totalTime += timeToUse;
      teamStats[team].count += 1;
      teamStats[team].cases.push(shortage);
    });

    // Calculate averages and format for chart
    return Object.entries(teamStats).map(([team, stats]) => ({
      team: team,
      avgTime: Math.round(stats.totalTime / stats.count * 10) / 10,
      count: stats.count,
      resolvedCount: stats.cases.filter(c => c.status === 'received').length,
      openCount: stats.cases.filter(c => c.status !== 'received').length
    })).sort((a, b) => a.avgTime - b.avgTime);
  };

  const getTeamTrendData = () => {
    // Get data for the last 8 weeks for team performance trends
    const weeks = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
      
      const weekNumber = Math.ceil(((weekStart - new Date(weekStart.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
      const weekLabel = `W${weekNumber}`;
      
      // Get all cases created in this week by team (including unfinished)
      const weekData = { week: weekLabel };
      const teams = ['Planning team', 'Purchase', 'Design', 'Store'];
      
      teams.forEach(team => {
        const teamCases = shortages.filter(shortage => {
          if (shortage.assignedTeam !== team) return false;
          const createdDate = new Date(shortage.shortageDate || shortage.createdAt);
          return createdDate >= weekStart && createdDate <= weekEnd;
        });
        
        if (teamCases.length > 0) {
          // Calculate average time including both resolved and unfinished cases
          const avgTime = teamCases.reduce((sum, s) => {
            const timeToUse = s.status === 'received' ? s.timeSpent : s.timeOpen;
            return sum + timeToUse;
          }, 0) / teamCases.length;
          weekData[team] = Math.round(avgTime * 10) / 10;
        } else {
          weekData[team] = null;
        }
      });
      
      weeks.push(weekData);
    }
    
    return weeks;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];
  const TEAM_COLORS = {
    'Planning team': '#0088FE',
    'Purchase': '#00C49F', 
    'Design': '#FFBB28',
    'Store': '#FF8042'
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading dashboard data...</div>
      </div>
    );
  }

  const kpis = getKPIs();
  const weeklyTrendData = getWeeklyTrendData();
  const sourceData = getSourceDistribution();
  const healthData = getOpenHealthDistribution();
  const teamPerformanceData = getTeamPerformanceData();
  const teamTrendData = getTeamTrendData();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        
        {/* Time Filter */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">New</p>
              <p className="text-xl font-bold text-gray-900">{kpis.newCases}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Resolved</p>
              <p className="text-xl font-bold text-gray-900">{kpis.resolvedCases}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Open Current</p>
              <p className="text-xl font-bold text-gray-900">{kpis.currentOpen}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Net Delta</p>
              <p className={`text-xl font-bold ${kpis.netOpenDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {kpis.netOpenDelta > 0 ? '+' : ''}{kpis.netOpenDelta}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">SLA 7d</p>
              <p className="text-xl font-bold text-gray-900">{kpis.sla7}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">SLA 14d</p>
              <p className="text-xl font-bold text-gray-900">{kpis.sla14}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Shortage Creation Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Shortage Creation Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="created" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Created"
              />
              <Line 
                type="monotone" 
                dataKey="resolvedIn7Days" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Resolved in 7 days"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Source Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Distribution (New Cases)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Team Average Total Time (All Cases) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Average Total Time (All Cases)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="team" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value, name) => [
                  `${value} days`, 
                  'Avg Total Time'
                ]}
                labelFormatter={(label) => `Team: ${label}`}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-300 rounded shadow">
                        <p className="font-medium">{`Team: ${label}`}</p>
                        <p className="text-blue-600">{`Avg Time: ${payload[0].value} days`}</p>
                        <p className="text-green-600">{`Resolved: ${data.resolvedCount}`}</p>
                        <p className="text-orange-600">{`Open: ${data.openCount}`}</p>
                        <p className="text-gray-600">{`Total Cases: ${data.count}`}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="avgTime" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Performance Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Trend (8 Weeks)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={teamTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value, name) => value ? [`${value} days`, name] : ['No data', name]}
              />
              <Line 
                type="monotone" 
                dataKey="Planning team" 
                stroke={TEAM_COLORS['Planning team']} 
                strokeWidth={2}
                connectNulls={false}
                name="Planning team"
              />
              <Line 
                type="monotone" 
                dataKey="Purchase" 
                stroke={TEAM_COLORS['Purchase']} 
                strokeWidth={2}
                connectNulls={false}
                name="Purchase"
              />
              <Line 
                type="monotone" 
                dataKey="Design" 
                stroke={TEAM_COLORS['Design']} 
                strokeWidth={2}
                connectNulls={false}
                name="Design"
              />
              <Line 
                type="monotone" 
                dataKey="Store" 
                stroke={TEAM_COLORS['Store']} 
                strokeWidth={2}
                connectNulls={false}
                name="Store"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Open Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Open Cases - Time Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={healthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#ff7300" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Performance Summary Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Summary (All Cases)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Team</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Avg Days</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Resolved</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Open</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformanceData.map((team, index) => (
                  <tr key={team.team} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-2 px-3 font-medium">{team.team}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        team.avgTime <= 7 ? 'bg-green-100 text-green-800' :
                        team.avgTime <= 14 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {team.avgTime}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-green-600 font-medium">{team.resolvedCount}</td>
                    <td className="py-2 px-3 text-right text-orange-600 font-medium">{team.openCount}</td>
                    <td className="py-2 px-3 text-right text-gray-600 font-medium">{team.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;