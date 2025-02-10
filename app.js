// 初始化Three.js场景
let scene, camera, renderer, geometry, material, mesh, controls;
let isAnimating = false;

// 导入API配置
import { API_CONFIG } from './config.js';

// 调试信息更新函数
function updateDebugInfo(message) {
    const debugInfo = document.getElementById('debugInfo');
    const timestamp = new Date().toLocaleTimeString();
    debugInfo.textContent += `[${timestamp}] ${message}\n`;
    debugInfo.scrollTop = debugInfo.scrollHeight;
    console.log(`[DEBUG] ${message}`);
}

// 更新处理状态
function updateProcessingStatus(status) {
    const processingStatus = document.getElementById('processingStatus');
    processingStatus.textContent = status;
}

// 初始化3D场景
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    const container = document.getElementById('canvas-container');
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    // 添加轨道控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // 添加网格辅助线和坐标轴
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    animate();
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// 创建几何体
function createGeometry(type, dimensions) {
    switch(type.toLowerCase()) {
        case 'cube':
        case '正方体':
        case '棱柱':
            return new THREE.BoxGeometry(
                dimensions.width || 1,
                dimensions.depth || 1,  // 交换depth和height
                dimensions.height || 1
            );
        case 'sphere':
        case '球体':
            return new THREE.SphereGeometry(dimensions.radius || 1, 32, 32);
        case 'cylinder':
        case '圆柱体':
            return new THREE.CylinderGeometry(
                dimensions.radiusTop || 1,
                dimensions.radiusBottom || 1,
                dimensions.height || 2,
                32
            );
        case 'cone':
        case '圆锥体':
            return new THREE.ConeGeometry(
                dimensions.radius || 1,
                dimensions.height || 2,
                32
            );
        case 'pyramid':
        case '棱锥':
            return new THREE.ConeGeometry(
                dimensions.baseWidth || 1,
                dimensions.height || 2,
                4
            );
        default:
            throw new Error('不支持的几何体类型：' + type);
    }
}

// 创建顶点标签精灵
function createPointLabel(text, position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '48px Arial';
    context.fillStyle = 'black';
    context.fillText(text, 0, 48);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(0.5, 0.5, 0.5);
    return sprite;
}

// 添加辅助线
function addHelperLine(startPoint, endPoint, color = 0x000000) {
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const material = new THREE.LineBasicMaterial({ 
        color: 0x000000,  // 统一使用黑色
        linewidth: 1,
        transparent: true,
        opacity: 1.0
    });
    return new THREE.Line(geometry, material);
}

// 添加棱柱的边线
function addPrismEdges(points) {
    const edges = [
        // 底面边
        ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
        // 顶面边
        ['A1', 'B1'], ['B1', 'C1'], ['C1', 'D1'], ['D1', 'A1'],
        // 侧棱
        ['A', 'A1'], ['B', 'B1'], ['C', 'C1'], ['D', 'D1']
    ];
    
    const pointMap = new Map(points.map(p => [p.name, p.coordinates]));
    
    edges.forEach(([start, end]) => {
        if (pointMap.has(start) && pointMap.has(end)) {
            const startPoint = new THREE.Vector3(...pointMap.get(start));
            const endPoint = new THREE.Vector3(...pointMap.get(end));
            const edge = addHelperLine(startPoint, endPoint);
            edge.material.linewidth = 1.5;  // 边线稍微粗一点
            scene.add(edge);
        }
    });
}

// 解析AI返回的几何体描述并创建3D模型
async function createGeometryFromDescription(description) {
    try {
        updateDebugInfo('开始创建3D几何体');
        updateProcessingStatus('正在创建3D模型...');

        // 清除现有的几何体
        scene.children = scene.children.filter(child => 
            child instanceof THREE.GridHelper || 
            child instanceof THREE.AxesHelper ||
            child instanceof THREE.AmbientLight ||
            child instanceof THREE.DirectionalLight
        );
        updateDebugInfo('清除现有几何体');

        const geometryData = description;
        updateDebugInfo(`创建${geometryData.geometryType}类型的几何体`);
        
        // 调整几何体位置以适应坐标系
        const centerX = geometryData.dimensions.width / 2;
        const centerY = geometryData.dimensions.depth / 2;
        const centerZ = geometryData.dimensions.height / 2;
        
        geometry = createGeometry(geometryData.geometryType, geometryData.dimensions);
        updateDebugInfo('几何体创建成功');
        
        // 创建完全透明的材质，只用于保持几何体结构
        material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: false,
            transparent: true,
            opacity: 0,  // 完全透明
            side: THREE.DoubleSide
        });
        
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // 添加顶点和标签
        if (geometryData.points) {
            // 添加棱柱的边线
            if (geometryData.geometryType.toLowerCase() === '棱柱') {
                addPrismEdges(geometryData.points);
            }
            
            geometryData.points.forEach(point => {
                const position = new THREE.Vector3(...point.coordinates);
                
                // 添加顶点球体（小一点，黑色）
                const pointGeometry = new THREE.SphereGeometry(0.03, 16, 16);
                const pointMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x000000,
                    transparent: false
                });
                const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
                pointMesh.position.copy(position);
                scene.add(pointMesh);
                
                // 添加顶点标签
                const label = createPointLabel(point.name, position);
                scene.add(label);
            });

            // 添加辅助线（虚线）
            if (geometryData.helperLines) {
                geometryData.helperLines.forEach(line => {
                    const startPoint = new THREE.Vector3(...line.start);
                    const endPoint = new THREE.Vector3(...line.end);
                    const helperLine = addHelperLine(startPoint, endPoint, 0x000000);  // 统一使用黑色
                    helperLine.material.opacity = 0.3;  // 降低辅助线透明度
                    helperLine.material.dashSize = 0.1;  // 添加虚线效果
                    helperLine.material.gapSize = 0.05;
                    scene.add(helperLine);
                });
            }
        }
        
        updateDebugInfo('3D模型添加到场景');
        
        // 调整相机位置以更好地查看模型
        camera.position.set(6, 6, 6);
        controls.target.set(centerX, centerY, centerZ);
        controls.update();
        updateDebugInfo('相机位置已重置');
        
    } catch (error) {
        updateDebugInfo('创建几何体时出错: ' + error.message);
        console.error('创建几何体时出错:', error);
        throw error;
    }
}

// 调用AI API解析几何题
async function analyzeGeometryProblem(problem) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const debugInfo = document.getElementById('debugInfo');
    
    try {
        loadingIndicator.style.display = 'flex';
        errorMessage.textContent = '';
        debugInfo.textContent = ''; // 清除之前的调试信息
        
        updateDebugInfo('开始处理几何题目');
        updateProcessingStatus('正在连接API服务器...');
        
        updateDebugInfo(`准备发送请求到 ${API_CONFIG.baseURL}/chat-messages`);
        const startTime = performance.now();
        
        const response = await axios({
            method: 'post',
            url: `${API_CONFIG.baseURL}/chat-messages`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            data: {
                query: `作为一个专业的立体几何解析助手，请将以下立体几何题目解析为标准的JSON格式。

题目内容：${problem}

请严格按照以下格式返回JSON：
{
    "geometryType": "棱柱",
    "dimensions": {
        "width": 4,
        "height": 2,
        "depth": 4
    },
    "points": [
        {"name": "A", "coordinates": [-2, -2, 0]},
        {"name": "B", "coordinates": [2, -2, 0]},
        {"name": "C", "coordinates": [2, 2, 0]},
        {"name": "D", "coordinates": [-2, 2, 0]},
        {"name": "A1", "coordinates": [-2, -2, 2]},
        {"name": "B1", "coordinates": [2, -2, 2]},
        {"name": "C1", "coordinates": [2, 2, 2]},
        {"name": "D1", "coordinates": [-2, 2, 2]},
        {"name": "E", "coordinates": [0, 0, 1]},
        {"name": "F", "coordinates": [2, 0, 1]}
    ],
    "helperLines": [
        {
            "start": [-2, -2, 0],
            "end": [2, 2, 0],
            "color": "0x666666",
            "description": "对角线AC"
        }
    ],
    "description": "四棱柱ABCD-A1B1C1D1，其中点E是CC1的中点，点F在BC上且BF=FC"
}

解析要求：
1. 所有数值必须是数字，不能用字符串
2. 坐标值必须是实际的数值，基于题目给定的条件计算
3. 几何体类型必须是以下之一：棱锥、棱柱、圆锥、圆柱、球体
4. 根据几何体类型提供相应的尺寸参数
5. 确保JSON格式完全正确，不要添加任何额外的文本说明
6. 所有点的坐标必须符合题目给定的条件和空间关系
7. 辅助线必须包含题目中所有的虚线和特殊线段
8. 辅助线颜色使用十六进制数值（如0x666666）

请直接返回JSON数据，不要有任何其他说明文字。`,
                response_mode: "blocking",
                user: "geometry_user",
                inputs: {},
                auto_generate_name: false
            },
            timeout: 60000 // 60秒超时
        });

        const endTime = performance.now();
        updateDebugInfo(`API响应时间: ${(endTime - startTime).toFixed(2)}ms`);

        if (!response.data || !response.data.answer) {
            updateDebugInfo('API返回数据格式错误');
            throw new Error('API返回数据格式错误');
        }

        updateProcessingStatus('正在解析AI返回的数据...');
        
        const content = response.data.answer;
        updateDebugInfo('收到AI响应：' + content.substring(0, 100) + '...');

        try {
            // 尝试从文本中提取JSON部分
            let jsonStr = content;
            // 如果返回的不是纯JSON，尝试提取JSON部分
            if (!content.trim().startsWith('{')) {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('未找到有效的JSON格式数据');
                }
                jsonStr = jsonMatch[0];
            }
            
            // 预处理JSON字符串，处理可能的格式问题
            jsonStr = jsonStr.replace(/([0-9a-fx]+):/g, '"$1":')  // 修复没有引号的键
                           .replace(/:\s*0x[0-9a-f]+\b/g, match => match.replace(/0x[0-9a-f]+/, `"${match.trim()}""`)) // 修复十六进制值
                           .replace(/,\s*}/g, '}')  // 移除尾随逗号
                           .replace(/,\s*]/g, ']'); // 移除数组中的尾随逗号

            const parsedData = JSON.parse(jsonStr);
            
            // 验证必要的字段
            if (!parsedData.geometryType) {
                throw new Error('缺少几何体类型');
            }
            if (!parsedData.dimensions) {
                throw new Error('缺少尺寸信息');
            }
            if (!parsedData.points || !Array.isArray(parsedData.points)) {
                throw new Error('缺少点坐标信息或格式错误');
            }
            
            // 验证所有坐标值是否为数字
            parsedData.points.forEach(point => {
                if (!Array.isArray(point.coordinates) || point.coordinates.length !== 3) {
                    throw new Error(`点${point.name}的坐标格式错误`);
                }
                point.coordinates.forEach(coord => {
                    if (typeof coord !== 'number') {
                        throw new Error(`点${point.name}的坐标值必须是数字`);
                    }
                });
            });
            
            updateDebugInfo('JSON解析成功，几何体类型：' + parsedData.geometryType);
            return parsedData;
        } catch (parseError) {
            updateDebugInfo('JSON解析失败：' + content);
            throw new Error('AI返回的数据格式不正确: ' + parseError.message);
        }
    } catch (error) {
        console.error('AI API调用错误:', error);
        let errorMsg = '解析题目时出错: ';
        
        if (error.response) {
            const errorData = error.response.data;
            errorMsg += errorData.message || errorData.error || error.message;
            updateDebugInfo('API错误响应：' + JSON.stringify(errorData));
        } else if (error.request) {
            errorMsg += '网络请求失败';
            updateDebugInfo('网络请求错误：请求未收到响应');
            if (error.code === 'ECONNABORTED') {
                errorMsg += ' (请求超时)';
            }
        } else {
            errorMsg += error.message;
            updateDebugInfo('其他错误：' + error.message);
        }
        
        errorMessage.textContent = errorMsg;
        throw error;
    } finally {
        loadingIndicator.style.display = 'none';
        updateProcessingStatus('处理完成');
    }
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    init();

    // 生成按钮点击事件
    document.getElementById('generateBtn').addEventListener('click', async () => {
        const problem = document.getElementById('geometryProblem').value;
        const errorMessage = document.getElementById('errorMessage');
        
        if (!problem) {
            errorMessage.textContent = '请输入立体几何题目！';
            return;
        }

        try {
            const geometryData = await analyzeGeometryProblem(problem);
            await createGeometryFromDescription(geometryData);
            errorMessage.textContent = '';
        } catch (error) {
            console.error('处理失败:', error);
            errorMessage.textContent = '生成3D模型时出错：' + error.message;
        }
    });

    // 控制按钮事件
    document.getElementById('rotateLeft').addEventListener('click', () => {
        if (mesh) mesh.rotation.y -= Math.PI / 4;
    });

    document.getElementById('rotateRight').addEventListener('click', () => {
        if (mesh) mesh.rotation.y += Math.PI / 4;
    });

    document.getElementById('zoomIn').addEventListener('click', () => {
        camera.position.multiplyScalar(0.8);
        controls.update();
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        camera.position.multiplyScalar(1.2);
        controls.update();
    });

    document.getElementById('reset').addEventListener('click', () => {
        if (mesh) {
            mesh.rotation.set(0, 0, 0);
            camera.position.set(5, 5, 5);
            controls.target.set(0, 0, 0);
            controls.update();
        }
    });
});

// 窗口大小改变时调整渲染器大小
window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
}); 