import sys
import json
import os

def simple_audio_analysis(file_path):
    """
    简单的音频分析函数
    基于音频文件大小和名称进行简单的风险判断
    """
    # 使用文件大小和名称生成确定性的随机结果
    file_size = os.path.getsize(file_path)
    file_name = os.path.basename(file_path)

    # 生成一个基于文件特征的伪随机值
    seed = hash(file_name + str(file_size)) % 1000

    # 模拟置信度 (0.7 - 0.99)
    confidence = 0.7 + (seed % 300) / 1000.0

    # 模拟风险等级
    if seed % 10 < 2:  # 20% 高风险
        result = "高风险"
    elif seed % 10 < 5:  # 30% 低风险
        result = "低风险"
    else:  # 50% 无风险
        result = "无风险"

    return result, confidence

def main():
    # 获取参数
    file_path = sys.argv[1]
    dir_path = sys.argv[2]

    # 使用简单的音频分析
    result, score = simple_audio_analysis(file_path)

    # 输出结果
    result_j = {
        "risk_level": result,
        "confidence": score
    }

    print(json.dumps(result_j))

if __name__ == '__main__':
    main()