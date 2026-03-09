运行 AI 模型（predict.py）说明

简介
- 该目录包含用于音频检测的 Python 脚本 `predict.py`，负责加载训练好的模型并对传入的音频文件输出风险等级和置信度（JSON）。

建议的虚拟环境与依赖安装（Windows PowerShell）：

# 创建并激活 venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt

运行方式（同步模式，直接用于后端 spawn 调用）
python predict.py <audio_file_path>

输出示例（stdout，会被后端解析为 JSON）
{"risk_level": "严重漏水", "confidence": 0.92}

超时与错误码
- 请确保后端设置了合理超时时间（默认 `AI_TIMEOUT_SECONDS`），以防模型运行卡住。超时或异常时，脚本应以非0退出代码结束并在 stdout/stderr 打印错误信息。

开发与调试建议
- 若使用 GPU，确保 CUDA 驱动与 PyTorch 版本匹配。
- 若调试模型推理过程，可在脚本中增加 `--debug` 选项输出更多日志。

备注
- 生产环境建议把模型服务化（例如启动为常驻的 REST/gRPC 服务或放入队列 worker），以提高并发与稳定性。该 README 仅说明当前仓库中同步调用的最小可行用法。