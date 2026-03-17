import sys
import json
import os
import argparse
import functools
from macls.predict import MAClsPredictor
from macls.utils.utils import add_arguments


def output_error(message):
    print(json.dumps({"error": message}, ensure_ascii=False))

def main():
    try:
        if len(sys.argv) < 2:
            output_error("缺少音频文件路径参数")
            sys.exit(1)

        file_path = sys.argv[1]
        dir_path = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(__file__))

        if not os.path.isfile(file_path):
            output_error(f"音频文件不存在: {file_path}")
            sys.exit(1)

        model_path = os.path.join(dir_path, 'model')
        config_path = os.path.join(dir_path, 'config', 'resnet_se.yml')
        label_list_path = os.path.join(dir_path, 'dataset', 'label_list.txt')

        parser = argparse.ArgumentParser(description="智慧水务音频识别")
        add_arg = functools.partial(add_arguments, argparser=parser)
        add_arg('configs', str, config_path, '配置文件')
        add_arg('use_gpu', bool, False, '是否使用GPU预测')
        add_arg('overwrites', str, f'dataset_conf.label_list_path={label_list_path}', '覆盖写入的配置文件参数')
        add_arg('model_path', str, model_path, '导出的预测模型文件路径')
        args = parser.parse_args(args=[])

        predictor = MAClsPredictor(
            configs=args.configs,
            model_path=args.model_path,
            use_gpu=args.use_gpu,
            overwrites=args.overwrites,
            log_level="error"
        )

        result, score = predictor.predict(file_path)
        if result == "2":
            result = "高风险"
        elif result == "1":
            result = "无风险"
        else:
            result = "低风险"

        result_j = {
            "risk_level": result,
            "confidence": float(score)
        }

        print(json.dumps(result_j, ensure_ascii=False))
    except Exception as e:
        output_error(str(e))
        sys.exit(1)


if __name__ == '__main__':
    main()